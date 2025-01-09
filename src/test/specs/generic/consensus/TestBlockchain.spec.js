class TestBlockchain extends FullChain {
    constructor(store, accounts, users, time, ignorePoW = false, transactionStore) {
        // XXX Set a large timeout when mining on demand.
        if (TestBlockchain.MINE_ON_DEMAND && jasmine && jasmine.DEFAULT_TIMEOUT_INTERVAL) {
            jasmine.DEFAULT_TIMEOUT_INTERVAL = 1200000;
        }

        super(store, accounts, time, transactionStore);
        this._users = users;
        this._invalidNonce = ignorePoW;
        return this._init();
    }

    /** @type {Accounts} */
    get accounts() {
        return this._accounts;
    }

    /** @type {Array.<{address: Address, publicKey: PublicKey, privateKey: PrivateKey}>} */
    get users() {
        return this._users;
    }

    /** @type {Time} */
    get time() {
        return this._time;
    }

    /**
     * @param {PublicKey} senderPubKey
     * @param {Address} recipientAddr
     * @param {number} amount
     * @param {number} fee
     * @param {number} validityStartHeight
     * @param {PrivateKey} [senderPrivKey]
     * @param {Signature} [signature]
     * @param {number} [networkId]
     * @return {BasicTransaction}
     */
    static createTransaction(senderPubKey, recipientAddr, amount = 1, validityStartHeight = 0, senderPrivKey = undefined, signature = undefined, networkId = undefined) {
        const transaction = new BasicTransaction(senderPubKey, recipientAddr, amount, validityStartHeight, undefined, networkId);

        // allow to hardcode a signature
        if (!signature) {
            // if no signature is provided, the secret key is required
            if (!senderPrivKey) {
                throw new Error('Signature computation requested, but no sender private key provided');
            }
            signature = Signature.create(senderPrivKey, senderPubKey, transaction.serializeContent());
        }
        transaction.signature = signature;

        return transaction;
    }

    // TODO can still run into balance problems: block height x and subsequent `mining` means that only the first x
    // users are guaranteed to have a non-zero balance. Depending on the existing transactions, this can improve a bit...
    async generateTransactions(numTransactions, noDuplicateSenders = true) {
        const numUsers = this.users.length;

        if (noDuplicateSenders && numTransactions > numUsers) {
            // only one transaction per user
            numTransactions = numUsers;
        }

        /* Note on transactions and balances:
         We fill up the balances of users in increasing order, therefore the size of the chain determines how many
         users already have a non-zero balance. Hence, for block x, all users up to user[x] have a non-zero balance.
         At the same time, there must not be more than one transaction from the same sender.
         */
        const transactions = [];
        for (let j = 0; j < numTransactions; j++) {
            const sender = this.users[j % numUsers];
            const recipient = this.users[(j + 1) % numUsers];

            // 10% transaction + 5% fee
            const account = await this.accounts.get(sender.address);
            const amount = Math.floor(account.balance / 10) || 1;
            const fee = Math.floor(amount / 2);

            const transaction = TestBlockchain.createTransaction(sender.publicKey, recipient.address, amount, this.height, sender.privateKey);

            transactions.push(transaction);
        }

        return transactions.sort((a, b) => a.compareBlockOrder(b));
    }

    /**
     * @param {{prevHash, interlinkHash, bodyHash, accountsHash, nBits, timestamp, nonce, height, interlink, minerAddr, transactions, numTransactions, version, superblockLevel}} options
     * @returns {Promise.<Block>}
     */
    async createBlock(options = {}) {
        const height = options.height || this.head.height + 1;

        let transactions = options.transactions;
        if (!transactions) {
            const numTransactions = typeof options.numTransactions !== 'undefined' ? options.numTransactions : height - 1;
            transactions = await this.generateTransactions(numTransactions);
        }
        let prunedAccounts = options.prunedAccounts;
        if (!prunedAccounts) {
            try {
                prunedAccounts = await this.accounts.gatherToBePrunedAccounts(transactions, height, this._transactionCache);
            } catch (e) {
                prunedAccounts = [];
            }
        }

        const minerAddr = options.minerAddr || this.users[this.height % this._users.length].address;     // user[0] created genesis, hence we start with user[1]
        const body = new BlockBody(minerAddr, transactions, new Uint8Array(0), prunedAccounts);

        const version = options.version || BlockHeader.Version.CURRENT_VERSION;
        const nBits = options.nBits || BlockUtils.targetToCompact(await this.getNextTarget());
        const interlink = options.interlink || await this.head.getNextInterlink(BlockUtils.compactToTarget(nBits), version);

        const prevHash = options.prevHash || this.headHash;
        const interlinkHash = options.interlinkHash || interlink.hash();
        const bodyHash = options.bodyHash || body.hash();

        let accountsHash = options.accountsHash;
        if (!accountsHash) {
            const accountsTx = await this._accounts.transaction();
            try {
                await accountsTx.commitBlockBody(body, height, this._transactionCache);
                accountsHash = await accountsTx.hash();
            } catch (e) {
                // The block is invalid, fill with broken accountsHash
                // TODO: This is harmful, as it might cause tests to succeed that should fail.
                accountsHash = new Hash(null);
            }
            await accountsTx.abort();
        }

        const timestamp = typeof options.timestamp !== 'undefined' ? options.timestamp : this.head.timestamp + Policy.blockTime(height);
        const nonce = options.nonce || 0;
        const header = new BlockHeader(prevHash, interlinkHash, bodyHash, accountsHash, nBits, height, timestamp, nonce, version);

        const block = new Block(header, interlink, body);

        if (nonce === 0) {
            await this.setOrMineBlockNonce(block, options.superblockLevel);
        }

        return block;
    }

    async setOrMineBlockNonce(block, superblockLevel) {
        let id = block.hash().toBase64();
        const mineSuperblock = typeof superblockLevel === 'number';
        if (mineSuperblock) {
            id += `@${superblockLevel}`;
        }

        TestBlockchain.BLOCKS[id] = block;

        if (TestBlockchain.NONCES[id]) {
            block.header.nonce = TestBlockchain.NONCES[id];
            if (!(await block.header.verifyProofOfWork())) {
                throw new Error(`Invalid nonce specified for block ${id}: ${block.header.nonce}`);
            }
        } else if (TestBlockchain.MINE_ON_DEMAND) {
            console.log(`No nonce available for block ${id}, will start mining${mineSuperblock ? ' superblock@' + superblockLevel : ''} at height ${block.height} following ${block.prevHash.toHex()}.`);

            await TestBlockchain.mineBlock(block, superblockLevel);

            TestBlockchain.NONCES[id] = block.header.nonce;
            console.log(`Mine on demand: Assigned ${id} to ${block.header.nonce}`);
        } else if (this._invalidNonce) {
            console.log(`No nonce available for block ${id}, but accepting invalid nonce.`);
        } else {
            throw new Error(`No nonce available for block ${id}: ${block}`);
        }
    }

    /**
     * @param {number} numBlocks
     * @param {number} [numUsers]
     * @param {boolean} [ignorePoW]
     * @return {Promise.<TestBlockchain>}
     */
    static async createVolatileTest(numBlocks, numUsers = 2, ignorePoW = false) {
        const accounts = await Accounts.createVolatile();
        const store = ChainDataStore.createVolatile();
        const users = TestBlockchain.getUsers(numUsers);
        /** @type {TransactionStore} */
        const transactionStore = await TransactionStore.createVolatile();
        const time = new Time();
        const testBlockchain = await new TestBlockchain(store, accounts, users, time, ignorePoW, transactionStore);

        // populating the blockchain
        for (let i = 0; i < numBlocks; i++) {
            const newBlock = await testBlockchain.createBlock(); //eslint-disable-line no-await-in-loop
            const success = await testBlockchain.pushBlock(newBlock); //eslint-disable-line no-await-in-loop
            if (success !== FullChain.OK_EXTENDED) {
                throw new Error('Failed to commit block');
            }
        }

        return testBlockchain;
    }

    static getUsers(count) {
        if (count > TestBlockchain.USERS.length) {
            throw `Too many users ${count} requested, ${TestBlockchain.USERS.length} available`;
        }

        const users = [];
        const keyPairs = TestBlockchain.USERS.slice(0, count)
            .map(encodedKeyPair => KeyPair.unserialize(BufferUtils.fromBase64(encodedKeyPair)));
        for (const keyPair of keyPairs) {
            const address = keyPair.publicKey.toAddress(); // eslint-disable-line no-await-in-loop
            users.push(TestBlockchain.generateUser(keyPair, address));
        }
        return users;
    }

    static async generateUsers(count) {
        const users = [];

        // First user, it needs to be known beforehand because the
        // genesis block will send the first miner reward to it.
        // This keypair is the one that the miner address of the test genesis block in DummyData.spec.js belongs to.
        const keys = KeyPair.unserialize(BufferUtils.fromBase64(TestBlockchain.USERS[0]));
        const address = keys.publicKey.toAddress();
        users.push(TestBlockchain.generateUser(keys, address));

        for (let i = 1; i < count; i++) {
            const keyPair = KeyPair.generate();
            const address = keyPair.publicKey.toAddress();

            users.push(TestBlockchain.generateUser(keyPair, address));
        }
        return users;
    }

    static generateUser(keyPair, address) {
        return {
            'keyPair': keyPair,
            'privateKey': keyPair.privateKey,
            'publicKey': keyPair.publicKey,
            'address': address
        };
    }

    /**
     * @param {Block} block
     * @param {number} [superblockLevel]
     * @returns {Promise.<number>}
     */
    static async mineBlock(block, superblockLevel) {
        const mineSuperblock = typeof superblockLevel === 'number';
        const targetLevel = BlockUtils.getTargetDepth(block.target);

        await TestBlockchain._miningPool.start();

        const share = await new Promise((resolve, error) => {
            const temp = function (share) {
                if (share.block.header.equals(block.header)) {
                    const shareLevel = BlockUtils.getHashDepth(share.hash) - targetLevel;
                    if (!mineSuperblock || shareLevel === superblockLevel) {
                        TestBlockchain._miningPool.off('share', temp.id);
                        resolve(share);
                    }
                }
            };
            temp.id = TestBlockchain._miningPool.on('share', temp);

            const shareCompact = mineSuperblock
                ? BlockUtils.targetToCompact(block.target / Math.pow(2, superblockLevel))
                : block.nBits;
            TestBlockchain._miningPool.startMiningOnBlock(block, shareCompact).catch(error);
        });

        TestBlockchain._miningPool.stop();

        block.header.nonce = share.nonce;
        if (!(await block.header.verifyProofOfWork())) {
            throw new Error('While mining the block was succesful, it is still considered invalid.');
        }

        return share.nonce;
    }

    static async mineBlocks() {
        const nonces = {};
        for (const hash in TestBlockchain.BLOCKS) {
            if (TestBlockchain.NONCES[hash]) {
                nonces[hash] = TestBlockchain.NONCES[hash];
            } else {
                await TestBlockchain.mineBlock(TestBlockchain.BLOCKS[hash]).then(nonce => {
                    nonces[hash] = nonce;
                    Log.i(`'${hash}': ${nonce}`);
                });
            }
        }
        return nonces;
    }

    static async mineBlocksJSON() {
        TestBlockchain.NONCES = await TestBlockchain.mineBlocks();
        TestBlockchain.printNonces();
    }

    static printNonces() {
        console.log(TestBlockchain.getNonces());
    }

    static getNonces() {
        const nonces = Object.assign({}, TestBlockchain.NONCES);
        for (const key of Object.keys(nonces)) {
            if (!TestBlockchain.BLOCKS[key]) {
                delete nonces[key];
            }
        }
        return TestBlockchain._getNonces(nonces);
    }

    static _getNonces(nonces) {
        // XXX Primitive JSON pretty printer
        return 'TestBlockchain.NONCES = ' + JSON.stringify(nonces)
            .replace(/"/g, '\'')
            .replace(/:/g, ': ')
            .replace(/,/g, ',\n    ')
            .replace(/{/g, '{\n    ')
            .replace(/}/g, '\n}')
            + ';\n';
    }

}
TestBlockchain._miningPool = new MinerWorkerPool(4);

TestBlockchain.MINE_ON_DEMAND = false;

TestBlockchain.BLOCKS = {};
TestBlockchain.USERS = [ // eth keypairs
    'AKom61kJXyQ0ptmwBQQ/i/YtTOq4RMGE0OmJ5I5N3CgEJAGnFMZA112HT5oH4rk7qZoyYYPCRcjPrdcxXjEvmepflIkwAjhhDpzPzawg5fuzB04Z0vRfTE1VObg26/fIQgA=',
    'nrX4+3r1yCL2Ybp0lBlhFnAPqnFaLoJ0AiXk/TU/YfMEix9FENwaBYotqJ/xGyyfMH5BmT/7B8ez8HYfQwClJsjM7G4zD1ok84miGQL2FqQFqoBZGA+btP3MYRi3Pxuz1QA=',
    'ZKl+Gql4rZn/ZeFaQNWt3c0KiYFtBd4YbPmRJn9gmUIEhLsj92C+o2o9CKftfSdsHoshhIYB3Mahw9eZ6S3arcOg1EIRz1K2HlCj3oczFsoCjzO3t0UWhJASTOoxY0jq+QA=',
    'rtqTivGFrcjX7UbVHGoGiuO2vYujbMzkcX8d3I9EcMQED5mFBQhvuirWOkdlP5fPvsLNxR+nkAaIjMWMvMM2JDJG/qIG5O38jEfm2ObFf+mfnqlOvnrLmZXau/fALvi8ggA=',
    'KfINKlYM3rcOkT8DU/LyTA1ki6tYC/V8uNioP/W1HA4E01qHXPwyn7ZzAN7ze3jjaSrjhu9QnhxFtb/3mBkR46H7pgtSwrKO1o1hBM2bcOc+IvyLMD6OGhu73V+UX9redgA=',
    'yQBvF3W/FyV65+t2K7g1ZEAp78Q6XqPXHDMtkZKLsO0E7r7pFb4DgjU68hqGIdD9hqpVgN2Qs6z8Aty2PLZ2s1U6aFrXun2LKU9mCq9oT1LONKkMcSpuOa7aX3a/CSjp+gA=',
    'l0OwFrVLcKfz5Pb66A+XYxM6kJ4K3+xxYPwT6bHY3eEEq6/VXc6deARu6yf7E1btiKSsRJoczUwGVJMO2Y2G99ykMqLXf4oTHZShfnB2oSZSiJzYKVgYltpsccxLzJig7AA=',
    '9AMxJRrUOz5cqkY8sRJz4R5PLINPjxBhS9Cf7z59OT4EPFGKKYYPmjBHJswmEOylvsOamsFrsIDtB62W7HoGyTPuuRt4XGJ+HJlfN+CTtJI/ruNKzaCoO4syu88BgLRHigA=',
    'lnBpyQo1JbOYWvsy5fSiSx25sSmoy7NEhLxJzeLYIssEQFODk3twnBbHZtdzu4f/rXdjr6LNslb7NPHRNyGLkeQgQi1OqIw1nrqBTtLayxrM8A/pcdbS1iF/Hjn/5Wk21AA=',
    'IFBw0tBxMalRMFxq+RrJ8XzapxsZgztwIuFe5swnYiYEEZIuMVC2gqELdIz4wQVZRHQHe7/nhf5vuHesSpn8Rna0u0vmxjgoBYjTDbcpK+4aRp6jc8EqCggB/s1yU7tVfgA=',
    'LNFLL0FASktmYfj0jrBq2psr6PAWV3HdDtpyT9q8tzoEwB5LQQ5d/ZveS798Z+qmQJZua9Zrff4YXXWiBrEX7o1gtV3cExo8fIjSgmaQhKOS6oxXFZ1b8qivJVHQoY5XVgA=',
    'ZjakSjcYZSblx+FD+QkRpSezdBklDho8wSSjmOoG+2wEe5SBow3QOzgViYdx4diZriwo7rinjLaoaDPRVGLIolafRmNya7oK46uRDI9v2mfX5anBNn0DQGqu6IhSK+JpXwA=',
    'Gj0Y7Zy7SVMoM1ebn3AJwR3Fdp6lzslhovXhZrzV8XUEmxYrMO4TKtAIjxkUBr52MKOewJVLocesBwVaPASMjXzsvXuP4w5mv9Ol7sCm854ZaErjzVlkDmdYkMX6HTuPEQA=',
    'elgi80EVjz3RIHEcSIj4R8Zb6ImmF3w0huBTtRmX1roEZkg8qvmr7n4OkwMERfJzjEOkdXpfv9D83VW+vNJcaEY0UNmaC7sd65MmHujru+WctACQszcww8PG98PU9USfDQA=',
    'Zu+uJilBHS/kyq4WTyAeytLu+ff0DKx/nG4fShktG20EZNSojyys0wJZOhesByV9ZVrykJbtPlW9A+/3FQqLRH8AjOFhMM/iZk2f+FwRzhZAziWMqPXee2y3d84SiQyd6gA=',
    'vlEC1KpHmz/NaJSnLKhYmeMtkJADa+fzzclOXukBL+gEkq0ACXWN8+5J+jsAAxFB3pEDMmt9D9Gjyn4TNgjOqX9MpZ+dRpcMKwy1e3aD5GuiYg4k1QmxXffUNVSMfboBYgA=',
    '6ManZp+E37lZjYppjl+ASYfYGrhLIjJpr0aInRnkb+YEtEUuuHLU/CQaVGCF7bP+8EqUfni5u4RpmoCHGbAWsv83iGx2BVDn+i914gUSmZKKTEg44+fy/356ROTrjJcaDQA=',
    'fFBUqgng/2mZOe27iLxFdSjRLExcfw9KTW9Ab7My8oAEw5/wFFpJRUGCB5Yi/yJKpSuJ29+I/oolOZ+kJ9eb7NwMs39n1wdRjpjrFgGoH1b6e7FvVGBSEAUTdN1SgTjuhAA=',
    'I3/rwBBErc1CEsEoeJILnD61GbZDOsB8dC6xKmKFEw4ELyF6BErrmh6bpkD18JEDYREopsjMI+G9RoamG5pewXUtJsVR5G521RYZPIODy35rsJ0QZNmBBuiJfIpBpYP2/wA=',
    '2pHoJ4R4wnt91PYUjbzx7PxzlGtsQWhTq2rwgLJQYe8EEm+CHGN/Sg379SvIOZ3471z1OoYKVV/KlEJ6pqxs+xY6ae2tt0NZj/9sUQrvYrB9GtCS4rn9gVM+Upu/mseifAA=',
    'vJp2fuqczgYNDCyxZqQ8SnwWoH1EGkvAzyLP2+igdZwE1C9oOaADvAAUMaw2wTvk19qA0/MRxqw1MeOQQOVZ8WF9gPm5mxhzOMBtuTQ2QdpfSudncGWhHh6pnfqQtY6OPAA=',
    'agPzWUCbQmevoKEq4LsZwS6wQyvPMyrJack2fLg6uvIEwhROQTqJUJw+pz3ZTr9UsYfJWQZCeW0eRS9TDpTJabQylRL4I4fetKiuqRj/5C1xDDkbAD18iw2s54WsumnVBwA=',
    'CU+ZC3kgegpxbBz8pS770RXJ0q3xaENtTQx1f1GTnU4EqIWxVEXziXCN39N5aeJ7oHHCIvQ2kFa0q05EXGNoSDQvEzH3v2PfijLeXPV3jt13zObQeNjAXJXrB7/JHc5cbAA=',
    'kTiTwq2oX1pC+F6ZvpRoGuLFFVb2n69DHZNPyOMko60EeggzkJTaQfh79btp9OK7+mQ7ev06Nv1qtzo8+TlZm4PLpoUwBRoVtYcLduO0KjJFLH+ecUwBqxSCiReQWOqgWAA=',
    'zCc0MBRac5W8XVLF7AiUUSJTRDg+x8J8bBK20mOPIdMEBW0PzAIYmuEDoOsDiwThWLpJcHDY1xEn1hYd4IuzA7rTbuzfQsTOCkQZ9rnKpd4utiuWInsCTbW/LURluwZC+AA='
];
Class.register(TestBlockchain);
