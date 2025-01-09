class MempoolFilter {
    constructor() {
        this._blacklist = new LimitInclusionHashSet(MempoolFilter.BLACKLIST_SIZE);
    }

    /**
     * @param {Transaction} tx
     * @returns {boolean}
     */
    acceptsTransaction(tx) {
        return tx.fee.gte(MempoolFilter.FEE)
            && tx.value.gte(MempoolFilter.VALUE)
            && tx.value.plus(tx.fee).gte(MempoolFilter.TOTAL_VALUE)
            && (
                !tx.hasFlag(Transaction.Flag.CONTRACT_CREATION)
                || (
                    tx.fee.gte(MempoolFilter.CONTRACT_FEE)
                    && tx.feePerByte.gte( MempoolFilter.CONTRACT_FEE_PER_BYTE)
                    && tx.value.gte(MempoolFilter.CONTRACT_VALUE)
                )
            );
    }

    /**
     * @param {Transaction} tx
     * @param {Account} oldAccount
     * @param {Account} newAccount
     * @returns {boolean}
     */
    acceptsRecipientAccount(tx, oldAccount, newAccount) {
        return newAccount.balance.gte(MempoolFilter.RECIPIENT_BALANCE)
            && (
                !oldAccount.isInitial()
                || (
                    tx.fee.gte(MempoolFilter.CREATION_FEE)
                    && tx.feePerByte.gte(MempoolFilter.CREATION_FEE_PER_BYTE)
                    && tx.value.gte(MempoolFilter.CREATION_VALUE)
                )
            );
    }

    /**
     * @param {Transaction} tx
     * @param {Account} oldAccount
     * @param {Account} newAccount
     * @returns {boolean}
     */
    acceptsSenderAccount(tx, oldAccount, newAccount) {
        return newAccount.balance.gte(MempoolFilter.SENDER_BALANCE)
            || newAccount.isInitial()
            || newAccount.isToBePruned();
    }

    /**
     * @param {Hash} hash
     */
    blacklist(hash) {
        this._blacklist.add(hash);
    }

    /**
     * @param {Hash} hash
     * @returns {boolean}
     */
    isBlacklisted(hash) {
        return this._blacklist.contains(hash);
    }
}
MempoolFilter.BLACKLIST_SIZE = 25000;

MempoolFilter.FEE = 0;
MempoolFilter.VALUE = 0;
MempoolFilter.TOTAL_VALUE = 0;
MempoolFilter.RECIPIENT_BALANCE = 0;
MempoolFilter.SENDER_BALANCE = 0;
MempoolFilter.CREATION_FEE = 0;
MempoolFilter.CREATION_FEE_PER_BYTE = 0;
MempoolFilter.CREATION_VALUE = 0;
MempoolFilter.CONTRACT_FEE = 0;
MempoolFilter.CONTRACT_FEE_PER_BYTE = 0;
MempoolFilter.CONTRACT_VALUE = 0;

Class.register(MempoolFilter);
