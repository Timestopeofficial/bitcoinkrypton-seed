class Mempool extends Observable {
    /**
     * @param {IBlockchain} blockchain
     * @param {Accounts} accounts
     */
    constructor(blockchain, accounts) {
        super();
        /** @type {IBlockchain} */
        this._blockchain = blockchain;
        /** @type {Accounts} */
        this._accounts = accounts;

        // Our pool of transactions.
        /** @type {SortedList.<Transaction>} */
        this._transactionsByFeePerByte = new SortedList(); // uses Transaction.compare, by fee descending
        /** @type {HashMap.<Hash, Transaction>} */
        this._transactionsByHash = new HashMap();
        /** @type {HashMap.<Address, MempoolTransactionSet>} */
        this._transactionSetBySender = new HashMap();
        /** @type {HashMap.<Address, HashSet.<Hash>>} */
        this._transactionSetByRecipient = new HashMap();
        /** @type {MempoolFilter} */
        this._filter = new MempoolFilter();
        /** @type {Synchronizer} */
        this._synchronizer = new Synchronizer();

        // Listen for changes in the blockchain head to evict transactions that have become invalid.
        blockchain.on('head-changed', (block, rebranching) => {
            if (!rebranching) {
                this._evictTransactions().catch(Log.e.tag(Mempool));
            }
        });
        blockchain.on('rebranched', async (revertBlocks) => {
            await this._evictTransactions();
            await this._restoreTransactions(revertBlocks);
        });
    }

    /**
     * @param {Transaction} transaction
     * @fires Mempool#transaction-added
     * @returns {Promise.<Mempool.ReturnCode>}
     */
    pushTransaction(transaction) {
        return this._synchronizer.push(() => this._pushTransaction(transaction));
    }

    /**
     * @param {Transaction} transaction
     * @returns {Promise.<Mempool.ReturnCode>}
     * @private
     */
    async _pushTransaction(transaction) {
        // Check if we already know this transaction.
        const hash = transaction.hash();
        if (this._transactionsByHash.contains(hash)) {
            return Mempool.ReturnCode.KNOWN;
        }

        // Check transaction against filter rules.
        if (!this._filter.acceptsTransaction(transaction)) {
            this._filter.blacklist(hash);
            return Mempool.ReturnCode.FILTERED;
        }

        const set = this._transactionSetBySender.get(transaction.sender) || new MempoolTransactionSet();
        // Check limit for free transactions.
        // if (transaction.fee / transaction.serializedSize < Mempool.TRANSACTION_RELAY_FEE_MIN
        //     && set.numBelowFeePerByte(Mempool.TRANSACTION_RELAY_FEE_MIN) >= Mempool.FREE_TRANSACTIONS_PER_SENDER_MAX) {
        //     return Mempool.ReturnCode.FEE_TOO_LOW;
        // }

        // Intrinsic transaction verification
        if (!transaction.verify()) {
            return Mempool.ReturnCode.INVALID;
        }

        // Retrieve recipient account and test incoming transaction.
        /** @type {Account} */
        try {
            const recipientAccount = await this._accounts.get(transaction.recipient);
            const newRecipientAccount = recipientAccount
                .withIncomingTransaction(transaction, this._blockchain.height + 1)
                .withContractCommand(transaction, this._blockchain.height + 1);

            // Check recipient account against filter rules.
            if (!this._filter.acceptsRecipientAccount(transaction, recipientAccount, newRecipientAccount)) {
                this._filter.blacklist(hash);
                return Mempool.ReturnCode.FILTERED;
            }
        } catch (e) {
            Log.d(Mempool, () => `Rejected transaction ${hash.toHex()} from ${transaction.sender.toUserFriendlyAddress()} - ${e.message}`);
            return Mempool.ReturnCode.INVALID;
        }

        // Retrieve sender account.
        /** @type {Account} */
        let senderAccount;
        try {
            senderAccount = await this._accounts.get(transaction.sender, transaction.senderType);
        } catch (e) {
            Log.d(Mempool, () => `Rejected transaction ${hash.toHex()} from ${transaction.sender.toUserFriendlyAddress()} - ${e.message}`);
            return Mempool.ReturnCode.INVALID;
        }

        // Add new transaction to the sender's pending transaction set. Then re-check all transactions in the set
        // in fee/byte order against the sender account state. Adding high fee transactions may thus invalidate
        // low fee transactions in the set.
        const transactions = [];
        const txsToRemove = [];
        let tmpAccount = senderAccount;
        for (const tx of set.copyAndAdd(transaction).transactions) {
            let error = 'transactions per sender exceeded';
            let exception;
            try {
                if (transactions.length < Mempool.TRANSACTIONS_PER_SENDER_MAX) {
                    tmpAccount = tmpAccount.withOutgoingTransaction(tx, this._blockchain.height + 1, this._blockchain.transactionCache);
                    transactions.push(tx);

                    // Transaction ok, move to next one.
                    continue;
                }
            } catch (e) {
                exception = e;
                error = e.message;
            }

            // An error occurred processing this transaction.
            // If the rejected transaction is the one we're pushing, fail.
            // Otherwise, evict the rejected transaction from the mempool.
            if (tx.equals(transaction)) {
                Log.d(Mempool, () => `Rejected transaction from ${transaction.sender.toUserFriendlyAddress()} - ${error}`);
                if (exception instanceof Account.DoubleTransactionError) {
                    return Mempool.ReturnCode.MINED;
                } else if (exception instanceof Account.ValidityError) {
                    return Mempool.ReturnCode.EXPIRED;
                } else {
                    return Mempool.ReturnCode.INVALID;
                }
            } else {
                txsToRemove.push(tx);
            }
        }

        // Check sender account against filter rules.
        if (!this._filter.acceptsSenderAccount(transaction, senderAccount, tmpAccount)) {
            this._filter.blacklist(hash);
            return Mempool.ReturnCode.FILTERED;
        }

        // Remove invalidated transactions.
        for (const tx of txsToRemove) {
            this._removeTransaction(tx);
        }

        // Transaction is valid, add it to the mempool.
        this._transactionsByFeePerByte.add(transaction);
        this._transactionsByHash.put(hash, transaction);
        this._transactionSetBySender.put(transaction.sender, new MempoolTransactionSet(transactions));
        /** @type {HashSet.<Hash>} */
        const byRecipient = this._transactionSetByRecipient.get(transaction.recipient) || new HashSet();
        byRecipient.add(transaction.hash());
        this._transactionSetByRecipient.put(transaction.recipient, byRecipient);

        // Tell listeners about the new valid transaction we received.
        this.fire('transaction-added', transaction);

        if (this._transactionsByFeePerByte.length > Mempool.SIZE_MAX) {
            this._popLowFeeTransaction();
        }

        return Mempool.ReturnCode.ACCEPTED;
    }

    /**
     * @private
     */
    _popLowFeeTransaction() {
        // Remove transaction
        const transaction = this._transactionsByFeePerByte.pop();

        /** @type {MempoolTransactionSet} */
        const set = this._transactionSetBySender.get(transaction.sender);
        set.remove(transaction);
        if (set.length === 0) this._transactionSetBySender.remove(transaction.sender);

        /** @type {HashSet.<Hash>} */
        const byRecipient = this._transactionSetByRecipient.get(transaction.recipient);
        if (byRecipient) {
            if (byRecipient.length === 1) {
                this._transactionSetByRecipient.remove(transaction.recipient);
            } else {
                byRecipient.remove(transaction.hash());
            }
        } else {
            Log.e(Mempool, `Invalid state: no transactionsByRecipient for ${transaction}`);
        }

        this._transactionsByHash.remove(transaction.hash());
        this.fire('transaction-removed', transaction);
    }

    /**
     * Does *not* remove transaction from transactionsBySender!
     * @param {Transaction} transaction
     * @private
     */
    _removeTransaction(transaction) {
        this._transactionsByHash.remove(transaction.hash());

        // TODO: Optimise remove from this._transactionsByMinFee.
        this._transactionsByFeePerByte.remove(transaction);

        /** @type {HashSet.<Hash>} */
        const byRecipient = this._transactionSetByRecipient.get(transaction.recipient);
        if (byRecipient) {
            if (byRecipient.length === 1) {
                this._transactionSetByRecipient.remove(transaction.recipient);
            } else {
                byRecipient.remove(transaction.hash());
            }
            this.fire('transaction-removed', transaction);
        } else {
            Log.e(Mempool, `Invalid state: no transactionsByRecipient for ${transaction}`);
        }
    }

    /**
     * @param {Hash} hash
     * @returns {Transaction}
     */
    getTransaction(hash) {
        return this._transactionsByHash.get(hash);
    }

    /**
     * @param {number} [maxSize]
     * @yields {IterableIterator.<Transaction>}
     */
    *transactionGenerator(maxSize = Infinity) {
        let size = 0;
        for (const /** @type {Transaction} */ tx of this._transactionsByFeePerByte) {
            const txSize = tx.serializedSize;
            if (size + txSize >= maxSize) continue;

            yield tx;
            size += txSize;
        }
    }

    /**
     * @param {number} [maxSize]
     * @returns {Array.<Transaction>}
     */
    getTransactions(maxSize = Infinity) {
        return Array.from(this.transactionGenerator(maxSize));
    }

    /**
     * @param {number} maxSize
     * @returns {Promise.<Array.<Transaction>>}
     */
    async getTransactionsForBlock(maxSize) {
        const transactions = this.getTransactions(maxSize);
        const prunedAccounts = await this._accounts.gatherToBePrunedAccounts(transactions, this._blockchain.height + 1, this._blockchain.transactionCache);
        const prunedAccountsSize = prunedAccounts.reduce((sum, acc) => sum + acc.serializedSize, 0);

        let size = prunedAccountsSize + transactions.reduce((sum, tx) => sum + tx.serializedSize, 0);
        while (size > maxSize) {
            size -= transactions.pop().serializedSize;
        }

        transactions.sort((a, b) => a.compareBlockOrder(b));
        return transactions;
    }

    /**
     * @param {Address} address
     * @return {Array.<Transaction>}
     */
    getPendingTransactions(address) {
        return this.getTransactionsBySender(address);
    }

    /**
     * @param {Address} address
     * @return {Array.<Transaction>}
     */
    getTransactionsBySender(address) {
        /** @type {MempoolTransactionSet} */
        const set = this._transactionSetBySender.get(address);
        return set ? set.transactions : [];
    }

    /**
     * @param {Address} address
     * @return {Array.<Transaction>}
     */
    getTransactionsByRecipient(address) {
        /** @type {HashSet.<Hash>} */
        const set = this._transactionSetByRecipient.get(address);
        if (!set) {
            return [];
        }

        /** @type {Array.<Transaction>} */
        const transactions = [];
        for (const hash of set.valueIterator()) {
            const tx = this._transactionsByHash.get(hash);
            Assert.that(!!tx);
            transactions.push(tx);
        }
        return transactions;
    }

    /**
     * @param {Array.<Address>} addresses
     * @param {number} [maxTransactions]
     * @return {Array.<Transaction>}
     */
    getTransactionsByAddresses(addresses, maxTransactions = Infinity) {
        const transactions = [];
        for (const address of addresses) {
            // Fetch transactions by sender first
            /** @type {Array.<Transaction>} */
            const bySender = this.getTransactionsBySender(address);
            for (const tx of bySender) {
                if (transactions.length >= maxTransactions) return transactions;
                transactions.push(tx);
            }

            // Fetch transactions by recipient second
            /** @type {Array.<Transaction>} */
            const byRecipient = this.getTransactionsByRecipient(address);
            for (const tx of byRecipient) {
                if (transactions.length >= maxTransactions) return transactions;
                transactions.push(tx);
            }
        }
        return transactions;
    }

    /**
     * @param {Hash} txHash
     * @returns {boolean}
     */
    isFiltered(txHash) {
        return this._filter.isBlacklisted(txHash);
    }

    /**
     * @param {Array.<Block>} blocks
     * @returns {Promise}
     * @private
     */
    _restoreTransactions(blocks) {
        return this._synchronizer.push(async () => {
            for (let i = blocks.length - 1; i >= 0; i--) {
                for (const tx of blocks[i].transactions) {
                    await this._pushTransaction(tx); // eslint-disable-line no-await-in-loop
                }
            }
        });
    }

    /**
     * @fires Mempool#transactions-ready
     * @returns {Promise}
     * @private
     */
    _evictTransactions() {
        return this._synchronizer.push(() => this.__evictTransactions());
    }

    /**
     * @fires Mempool#transactions-ready
     * @returns {Promise}
     * @private
     */
    async __evictTransactions() {
        // Evict all transactions from the pool that have become invalid due
        // to changes in the account state (i.e. typically because the were included
        // in a newly mined block). No need to re-check signatures.
        for (const sender of this._transactionSetBySender.keys()) {
            /** @type {MempoolTransactionSet} */
            const set = this._transactionSetBySender.get(sender);

            try {
                const senderAccount = await this._accounts.get(set.sender, set.senderType);

                // If a transaction in the set is not valid anymore,
                // we try to construct a new set based on the heuristic of including
                // high fee/byte transactions first.
                const transactions = [];
                let account = senderAccount;
                for (const tx of set.transactions) {
                    try {
                        const tmpAccount = account.withOutgoingTransaction(tx, this._blockchain.height + 1, this._blockchain.transactionCache);

                        const recipientAccount = await this._accounts.get(tx.recipient);
                        recipientAccount
                            .withIncomingTransaction(tx, this._blockchain.height + 1)
                            .withContractCommand(tx, this._blockchain.height + 1);

                        transactions.push(tx);
                        account = tmpAccount;
                    } catch (e) {
                        // Remove transaction
                        this._removeTransaction(tx);
                    }
                }
                if (transactions.length === 0) {
                    this._transactionSetBySender.remove(sender);
                } else {
                    this._transactionSetBySender.put(sender, new MempoolTransactionSet(transactions));
                }
            } catch (e) {
                // In case of an error, remove all transactions of this set.
                for (const tx of set.transactions) {
                    this._removeTransaction(tx);
                }
                this._transactionSetBySender.remove(sender);
            }
        }

        // Tell listeners that the pool has updated after a blockchain head change.
        /**
         * @event Mempool#transactions-ready
         */
        this.fire('transactions-ready');
    }

    /** @type {number} */
    get length() {
        return this._transactionsByHash.length;
    }

    /** @type {Synchronizer} */
    get queue() {
        return this._synchronizer;
    }
}

/**
 * Fee threshold in sat/byte below which transactions are considered "free".
 * @type {number}
 */
Mempool.TRANSACTION_RELAY_FEE_MIN = 1;
/**
 * Maximum number of transactions per sender.
 * @type {number}
 */
Mempool.TRANSACTIONS_PER_SENDER_MAX = 2100;
/**
 * Maximum number of "free" transactions per sender.
 * @type {number}
 */
Mempool.FREE_TRANSACTIONS_PER_SENDER_MAX = 10;
/**
 * Maximum number of transactions in the mempool.
 * @type {number}
 */
Mempool.SIZE_MAX = 2100000;

/** @enum {number} */
Mempool.ReturnCode = {
    EXPIRED: -5,
    MINED: -4,
    FILTERED: -3,
    FEE_TOO_LOW: -2,
    INVALID: -1,

    ACCEPTED: 1,
    KNOWN: 2
};

Class.register(Mempool);
