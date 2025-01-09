describe('VestingContract', () => {
    const pubKey = PublicKey.unserialize(BufferUtils.fromBase64(Dummy.publicKey1));
    const recipient = Address.unserialize(BufferUtils.fromBase64(Dummy.address1));
    const sender = Address.unserialize(BufferUtils.fromBase64(Dummy.address2));

    it('can serialize and unserialize itself', () => {
        const account = new VestingContract(1000, Address.NULL, 1, 1440, 1, 800);
        const account2 = /** @type {VestingContract} */ Account.unserialize(account.serialize());

        expect(account2 instanceof VestingContract).toBeTruthy();
        expect(account2.type).toEqual(account.type);
        expect(account2.balance).toEqual(account.balance);
        expect(account2.vestingStart).toEqual(account.vestingStart);
        expect(account2.vestingStepBlocks).toEqual(account.vestingStepBlocks);
        expect(account2.vestingStepAmount).toEqual(account.vestingStepAmount);
        expect(account2.vestingTotalAmount).toEqual(account.vestingTotalAmount);
    });

    it('is self plain', () => {
        const account1 = new VestingContract(1000, Address.NULL, 1, 1440, 1, 800);
        const account2 = Account.fromPlain(account1);
        expect(account1.equals(account2)).toBeTruthy();
    });

    it('can be converted to plain and back', () => {
        const account1 = new VestingContract(1000, Address.NULL, 1, 1440, 1, 800);
        const plain = JSON.stringify(account1.toPlain());
        const account2 = Account.fromPlain(JSON.parse(plain));
        expect(account1.equals(account2)).toBeTruthy();
    });

    it('can handle balance changes', () => {
        const account = new VestingContract(0);

        expect(account.balance.eq(0)).toBe(true);
        expect(account.withBalance(10).balance.eq(10)).toBe(true);
        expect(account.withBalance(Number.MAX_SAFE_INTEGER).balance.eq(Number.MAX_SAFE_INTEGER)).toBe(true);
        expect(account.withBalance(Number.MAX_SAFE_INTEGER).withBalance(0).balance.eq(0)).toBe(true);

        expect(() => account.withBalance(-1)).toThrowError('Malformed balance');
        expect(() => account.withBalance(NaN)).toThrowError('Malformed balance');
    });

    it('will deny incoming transactions', (done) => {
        (async () => {
            const transaction = new BasicTransaction(pubKey, recipient, 100, 0);
            expect(await VestingContract.verifyIncomingTransaction(transaction)).toBeFalsy();
        })().then(done, done.fail);
    });

    it('will fail incoming transactions', () => {
        let account = new VestingContract(0);

        expect(account.balance.eq(0)).toBe(true);

        let transaction = new BasicTransaction(pubKey, recipient, 100, 0);
        expect(() => account = account.withIncomingTransaction(transaction, 1)).toThrow();

        transaction = new BasicTransaction(pubKey, recipient, 1, 0);
        expect(() => account = account.withIncomingTransaction(transaction, 1)).toThrow();
    });

    it('can falsify invalid outgoing transaction', (done) => {
        (async () => {
            const keyPair = KeyPair.generate();
            const signature = Signature.unserialize(BufferUtils.fromBase64(Dummy.signature1));

            let transaction = new BasicTransaction(pubKey, recipient, 100, 0, signature);

            expect(await VestingContract.verifyOutgoingTransaction(transaction)).toBeFalsy();

            transaction = new ExtendedTransaction(keyPair.publicKey.toAddress(), Account.Type.VESTING, recipient, Account.Type.BASIC, 100, 0, Transaction.Flag.NONE, new Uint8Array(0));
            const sigProof = SignatureProof.singleSig(keyPair.publicKey, Signature.create(keyPair.privateKey, keyPair.publicKey, transaction.serializeContent()));
            const proof = new SerialBuffer(sigProof.serializedSize + 1);
            sigProof.serialize(proof);
            transaction.proof = proof;
        })().then(done, done.fail);
    });

    it('can verify valid outgoing transaction', (done) => {
        (async () => {
            const keyPair = KeyPair.generate();

            const transaction = new BasicTransaction(keyPair.publicKey, recipient, 100, 0);
            transaction.signature = Signature.create(keyPair.privateKey, keyPair.publicKey, transaction.serializeContent());

            expect(await VestingContract.verifyOutgoingTransaction(transaction)).toBeTruthy();
        })().then(done, done.fail);
    });

    it('can apply outgoing transaction', () => {
        const keyPair = KeyPair.generate();
        const address = keyPair.publicKey.toAddress();

        let account = new VestingContract(3000100, address, 0, 100, 50, 100);

        expect(account.balance.eq(3000100)).toBe(true);

        const cache = new TransactionCache();
        let transaction = new BasicTransaction(keyPair.publicKey, recipient, 1, 110);
        transaction.signature = Signature.create(keyPair.privateKey, keyPair.publicKey, transaction.serializeContent());
        account = account.withOutgoingTransaction(transaction, 110, cache);

        expect(account.balance.eq(2000099)).toBe(true);

        transaction = new BasicTransaction(keyPair.publicKey, recipient, 50, 220);
        transaction.signature = Signature.create(keyPair.privateKey, keyPair.publicKey, transaction.serializeContent());
        account = account.withOutgoingTransaction(transaction, 220, cache);

        expect(account.balance.eq(1000049)).toBe(true);

        transaction = new BasicTransaction(keyPair.publicKey, recipient, 49, 230);
        transaction.signature = Signature.create(keyPair.privateKey, keyPair.publicKey, transaction.serializeContent());
        account = account.withOutgoingTransaction(transaction, 230, cache);

        expect(account.balance.eq(0)).toBe(true);
    });

    it('refuses to apply invalid outgoing transaction', () => {
        const keyPair = KeyPair.generate();
        const address = keyPair.publicKey.toAddress();

        const account = new VestingContract(100, address, 0, 100, 50);

        const cache = new TransactionCache();
        let transaction = new BasicTransaction(keyPair.publicKey, recipient, 1, 1);

        transaction = new BasicTransaction(keyPair.publicKey, recipient, 1, 0);
        transaction.signature = Signature.create(keyPair.privateKey, keyPair.publicKey, transaction.serializeContent());
        expect(() => account.withOutgoingTransaction(transaction, 1, cache)).toThrowError('Balance Error!');

        transaction = new BasicTransaction(keyPair.publicKey, recipient, 75, 0);
        transaction.signature = Signature.create(keyPair.privateKey, keyPair.publicKey, transaction.serializeContent());
        expect(() => account.withOutgoingTransaction(transaction, 150, cache)).toThrowError('Balance Error!');

        transaction = new BasicTransaction(keyPair.publicKey, recipient, 101, 0);
        transaction.signature = Signature.create(keyPair.privateKey, keyPair.publicKey, transaction.serializeContent());
        expect(() => account.withOutgoingTransaction(transaction, 1500, cache)).toThrowError('Balance Error!');

        // TODO: more tests
    });

    it('can revert outgoing transaction', () => {
        const keyPair = KeyPair.generate();
        const address = keyPair.publicKey.toAddress();

        let account = new VestingContract(100, address);

        expect(account.balance.eq(100)).toBe(true);

        const cache = new TransactionCache();
        const transaction = new BasicTransaction(keyPair.publicKey, recipient, 1, 0);
        transaction.signature = Signature.create(keyPair.privateKey, keyPair.publicKey, transaction.serializeContent());
        account = account.withOutgoingTransaction(transaction, 1, cache);

        expect(account.balance.eq(99)).toBe(true);
        cache.transactions.add(transaction.hash());

        account = account.withOutgoingTransaction(transaction, 1, cache, true);

        expect(account.balance.eq(100)).toBe(true);
    });

    it('can create vesting account via transaction and vest it', () => {
        const keyPair = KeyPair.generate();
        const address = keyPair.publicKey.toAddress();

        const cache = new TransactionCache();

        let buf = new SerialBuffer(4 + Address.SERIALIZED_SIZE);
        address.serialize(buf);
        buf.writeUint32(1000);
        let creationTransaction = new ExtendedTransaction(sender, Account.Type.BASIC, Address.CONTRACT_CREATION, Account.Type.VESTING, 1000100, 0, Transaction.Flag.CONTRACT_CREATION, buf);
        creationTransaction.proof = SignatureProof.singleSig(keyPair.publicKey, Signature.create(keyPair.privateKey, keyPair.publicKey, creationTransaction.serializeContent())).serialize();
        let account = Account.INITIAL.withIncomingTransaction(creationTransaction, 1).withContractCommand(creationTransaction, 1);
        let transaction = new ExtendedTransaction(creationTransaction.recipient, Account.Type.VESTING, recipient, Account.Type.BASIC, 1, 2, Transaction.Flag.NONE, new Uint8Array(0));
        transaction.proof = SignatureProof.singleSig(keyPair.publicKey, Signature.create(keyPair.privateKey, keyPair.publicKey, creationTransaction.serializeContent())).serialize();
        expect(() => account.withOutgoingTransaction(transaction, 2, cache)).toThrowError('Balance Error!');
        
        transaction = new ExtendedTransaction(creationTransaction.recipient, Account.Type.VESTING, recipient, Account.Type.BASIC, 1, 1001, Transaction.Flag.NONE, new Uint8Array(0));
        transaction.proof = SignatureProof.singleSig(keyPair.publicKey, Signature.create(keyPair.privateKey, keyPair.publicKey, creationTransaction.serializeContent())).serialize();
        expect(account.withOutgoingTransaction(transaction, 1001, cache).balance.eq(99)).toBe(true);

        buf = new SerialBuffer(24 + Address.SERIALIZED_SIZE);
        address.serialize(buf);
        buf.writeUint32(0);
        buf.writeUint32(100);
        buf.writeUint128(new BigNumber(50));

        creationTransaction = new ExtendedTransaction(sender, Account.Type.BASIC, Address.CONTRACT_CREATION, Account.Type.VESTING, 100, 0, Transaction.Flag.CONTRACT_CREATION, buf);
        creationTransaction.proof = SignatureProof.singleSig(keyPair.publicKey, Signature.create(keyPair.privateKey, keyPair.publicKey, creationTransaction.serializeContent())).serialize();
        
        account = Account.INITIAL.withIncomingTransaction(creationTransaction, 1).withContractCommand(creationTransaction, 1);
        
        transaction = new ExtendedTransaction(creationTransaction.recipient, Account.Type.VESTING, recipient, Account.Type.BASIC, 1, 2, Transaction.Flag.NONE, new Uint8Array(0));
        transaction.proof = SignatureProof.singleSig(keyPair.publicKey, Signature.create(keyPair.privateKey, keyPair.publicKey, creationTransaction.serializeContent())).serialize();
        expect(() => account.withOutgoingTransaction(transaction, 2, cache)).toThrowError('Balance Error!');
        
        transaction = new ExtendedTransaction(creationTransaction.recipient, Account.Type.VESTING, recipient, Account.Type.BASIC, 1, 101, Transaction.Flag.NONE, new Uint8Array(0));
        transaction.proof = SignatureProof.singleSig(keyPair.publicKey, Signature.create(keyPair.privateKey, keyPair.publicKey, creationTransaction.serializeContent())).serialize();
        expect(account.withOutgoingTransaction(transaction, 101, cache).balance).toBe(99);
        
        transaction = new ExtendedTransaction(creationTransaction.recipient, Account.Type.VESTING, recipient, Account.Type.BASIC, 51, 101, Transaction.Flag.NONE, new Uint8Array(0));
        transaction.proof = SignatureProof.singleSig(keyPair.publicKey, Signature.create(keyPair.privateKey, keyPair.publicKey, creationTransaction.serializeContent())).serialize();
        expect(() => account.withOutgoingTransaction(transaction, 101, cache)).toThrowError('Balance Error!');
        
        transaction = new ExtendedTransaction(creationTransaction.recipient, Account.Type.VESTING, recipient, Account.Type.BASIC, 51, 201, Transaction.Flag.NONE, new Uint8Array(0));
        transaction.proof = SignatureProof.singleSig(keyPair.publicKey, Signature.create(keyPair.privateKey, keyPair.publicKey, creationTransaction.serializeContent())).serialize();
        expect(account.withOutgoingTransaction(transaction, 201, cache).balance).toBe(49);

        buf = new SerialBuffer(40 + Address.SERIALIZED_SIZE);
        address.serialize(buf);
        buf.writeUint32(0);
        buf.writeUint32(100);
        buf.writeUint128(new BigNumber(40));
        buf.writeUint128(new BigNumber(80));
        creationTransaction = new ExtendedTransaction(sender, Account.Type.BASIC, Address.CONTRACT_CREATION, Account.Type.VESTING, 100, 0, Transaction.Flag.CONTRACT_CREATION, buf);
        creationTransaction.proof = SignatureProof.singleSig(keyPair.publicKey, Signature.create(keyPair.privateKey, keyPair.publicKey, creationTransaction.serializeContent())).serialize();
        account = Account.INITIAL.withIncomingTransaction(creationTransaction, 1).withContractCommand(creationTransaction, 1);
        transaction = new ExtendedTransaction(creationTransaction.recipient, Account.Type.VESTING, recipient, Account.Type.BASIC, 20, 2, Transaction.Flag.NONE, new Uint8Array(0));
        transaction.proof = SignatureProof.singleSig(keyPair.publicKey, Signature.create(keyPair.privateKey, keyPair.publicKey, creationTransaction.serializeContent())).serialize();
        expect(account.withOutgoingTransaction(transaction, 2, cache).balance).toBe(80);
        transaction = new ExtendedTransaction(creationTransaction.recipient, Account.Type.VESTING, recipient, Account.Type.BASIC, 60, 2, Transaction.Flag.NONE, new Uint8Array(0));
        transaction.proof = SignatureProof.singleSig(keyPair.publicKey, Signature.create(keyPair.privateKey, keyPair.publicKey, creationTransaction.serializeContent())).serialize();
        expect(() => account.withOutgoingTransaction(transaction, 2, cache)).toThrowError('Balance Error!');
        transaction = new ExtendedTransaction(creationTransaction.recipient, Account.Type.VESTING, recipient, Account.Type.BASIC, 60, 101, Transaction.Flag.NONE, new Uint8Array(0));
        transaction.proof = SignatureProof.singleSig(keyPair.publicKey, Signature.create(keyPair.privateKey, keyPair.publicKey, creationTransaction.serializeContent())).serialize();
        expect(account.withOutgoingTransaction(transaction, 101, cache).balance).toBe(40);
        transaction = new ExtendedTransaction(creationTransaction.recipient, Account.Type.VESTING, recipient, Account.Type.BASIC, 100, 101, Transaction.Flag.NONE, new Uint8Array(0));
        transaction.proof = SignatureProof.singleSig(keyPair.publicKey, Signature.create(keyPair.privateKey, keyPair.publicKey, creationTransaction.serializeContent())).serialize();
        expect(() => account.withOutgoingTransaction(transaction, 101, cache)).toThrowError('Balance Error!');
        transaction = new ExtendedTransaction(creationTransaction.recipient, Account.Type.VESTING, recipient, Account.Type.BASIC, 100, 201, Transaction.Flag.NONE, new Uint8Array(0));
        transaction.proof = SignatureProof.singleSig(keyPair.publicKey, Signature.create(keyPair.privateKey, keyPair.publicKey, creationTransaction.serializeContent())).serialize();
        expect(account.withOutgoingTransaction(transaction, 201, cache).balance).toBe(0);
    });

    it('can plain creation transaction', () => {
        const keyPair = KeyPair.generate();
        const address = keyPair.publicKey.toAddress();

        let buf = new SerialBuffer(4 + Address.SERIALIZED_SIZE);
        address.serialize(buf);
        buf.writeUint32(1000);
        let creationTransaction = new ExtendedTransaction(sender, Account.Type.BASIC, Address.CONTRACT_CREATION, Account.Type.VESTING, 100, 0, Transaction.Flag.CONTRACT_CREATION, buf);
        creationTransaction.proof = SignatureProof.singleSig(keyPair.publicKey, Signature.create(keyPair.privateKey, keyPair.publicKey, creationTransaction.serializeContent())).serialize();
        expect(creationTransaction.equals(Transaction.fromPlain(creationTransaction.toPlain())));

        buf = new SerialBuffer(24 + Address.SERIALIZED_SIZE);
        address.serialize(buf);
        buf.writeUint32(0);
        buf.writeUint32(100);
        buf.writeUint128(new BigNumber(50));
        creationTransaction = new ExtendedTransaction(sender, Account.Type.BASIC, Address.CONTRACT_CREATION, Account.Type.VESTING, 100, 0, Transaction.Flag.CONTRACT_CREATION, buf);
        creationTransaction.proof = SignatureProof.singleSig(keyPair.publicKey, Signature.create(keyPair.privateKey, keyPair.publicKey, creationTransaction.serializeContent())).serialize();
        expect(creationTransaction.equals(Transaction.fromPlain(creationTransaction.toPlain())));

        buf = new SerialBuffer(40 + Address.SERIALIZED_SIZE);
        address.serialize(buf);
        buf.writeUint32(0);
        buf.writeUint32(100);
        buf.writeUint128(new BigNumber(40));
        buf.writeUint128(new BigNumber(80));
        creationTransaction = new ExtendedTransaction(sender, Account.Type.BASIC, Address.CONTRACT_CREATION, Account.Type.VESTING, 100, 0, Transaction.Flag.CONTRACT_CREATION, buf);
        creationTransaction.proof = SignatureProof.singleSig(keyPair.publicKey, Signature.create(keyPair.privateKey, keyPair.publicKey, creationTransaction.serializeContent())).serialize();
        expect(creationTransaction.equals(Transaction.fromPlain(creationTransaction.toPlain())));
    });

    it('can plain outgoing transaction', () => {
        const keyPair = KeyPair.generate();

        const transaction = new ExtendedTransaction(keyPair.publicKey.toAddress(), Account.Type.VESTING, recipient, Account.Type.BASIC, 100, 0, Transaction.Flag.NONE, new Uint8Array(0));
        const sigProof = SignatureProof.singleSig(keyPair.publicKey, Signature.create(keyPair.privateKey, keyPair.publicKey, transaction.serializeContent()));
        const proof = new SerialBuffer(sigProof.serializedSize + 1);
        sigProof.serialize(proof);
        transaction.proof = proof;

        expect(transaction.equals(Transaction.fromPlain(transaction.toPlain())));
    });

    it('has toString method', () => {
        const account = new VestingContract(100);
        expect(() => account.toString()).not.toThrow();
    });

    it('can be pruned', (done) => {
        (async () => {
            const testBlockchain = await TestBlockchain.createVolatileTest(0, 4);
            const user1 = testBlockchain.users[0];

            const buf = new SerialBuffer(4 + Address.SERIALIZED_SIZE);
            user1.address.serialize(buf);
            buf.writeUint32(0);
            const creationTransaction = new ExtendedTransaction(user1.address, Account.Type.BASIC, Address.CONTRACT_CREATION, Account.Type.VESTING, 100, 0, Transaction.Flag.CONTRACT_CREATION, buf);
            creationTransaction.proof = SignatureProof.singleSig(user1.publicKey, Signature.create(user1.privateKey, user1.publicKey, creationTransaction.serializeContent())).serialize();

            let block = await testBlockchain.createBlock({transactions: [creationTransaction]});
            expect(await testBlockchain.pushBlock(block)).toBeGreaterThan(-1);
            const oldAccount = await testBlockchain.accounts.get(creationTransaction.recipient);

            const clearTransaction = new ExtendedTransaction(creationTransaction.recipient, Account.Type.VESTING, user1.address, Account.Type.BASIC, 100, 0, Transaction.Flag.NONE, new Uint8Array(0));
            clearTransaction.proof = SignatureProof.singleSig(user1.publicKey, Signature.create(user1.privateKey, user1.publicKey, clearTransaction.serializeContent())).serialize();
            block = await testBlockchain.createBlock({transactions: [clearTransaction]});
            expect(block.body.prunedAccounts.length).toBe(1);

            expect(await testBlockchain.pushBlock(block)).toBeGreaterThan(-1);

            await testBlockchain.accounts.revertBlock(block, testBlockchain.transactionCache);
            await testBlockchain.transactionCache.revertBlock(block);
            expect(oldAccount.equals(await testBlockchain.accounts.get(creationTransaction.recipient))).toBeTruthy();
            await testBlockchain.accounts.commitBlock(block, testBlockchain.transactionCache);
            await testBlockchain.transactionCache.pushBlock(block);
        })().then(done, done.fail);
    });
});
