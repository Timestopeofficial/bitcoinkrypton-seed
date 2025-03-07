/**
 * @abstract
 */
class Account {
    /**
     * @param {Account.Type} type
     * @param {BigNumber|number|string} balance
     */
    constructor(type, balance) {
        const bigBalance = new BigNumber(balance);
        if (!NumberUtils.isUint8(type)) throw new Error('Malformed type');
        if (!NumberUtils.isUint128(bigBalance)) throw new Error('Malformed balance');

        /** @type {Account.Type} */
        this._type = type;
        /** @type {BigNumber} */
        this._balance = bigBalance;
    }

    /**
     * Create Account object from binary form.
     * @param {SerialBuffer} buf Buffer to read from.
     * @return {Account} Newly created Account object.
     */
    static unserialize(buf) {
        const type = /** @type {Account.Type} */ buf.readUint8();
        buf.readPos--;

        if (!Account.TYPE_MAP.has(type)) {
            throw new Error('Unknown account type');
        }

        return Account.TYPE_MAP.get(type).unserialize(buf);
    }

    /**
     * Serialize this Account object into binary form.
     * @param {?SerialBuffer} [buf] Buffer to write to.
     * @return {SerialBuffer} Buffer from `buf` or newly generated one.
     */
    serialize(buf) {
        buf = buf || new SerialBuffer(this.serializedSize);
        buf.writeUint8(this._type);
        buf.writeUint128(this._balance);
        return buf;
    }

    /**
     * @return {number}
     */
    get serializedSize() {
        return /*type*/ 1
            + /*balance*/ 16;
    }

    /**
     * Check if two Accounts are the same.
     * @param {Account} o Object to compare with.
     * @return {boolean} Set if both objects describe the same data.
     */
    equals(o) {
        return BufferUtils.equals(this.serialize(), o.serialize());
    }

    toString() {
        return `Account{type=${this._type}, balance=${this._balance.toString()}`;
    }

    /**
     * @param {Account|object} o
     */
    static fromAny(o) {
        if (o instanceof Account) return o;
        return Account.fromPlain(o);
    }

    /**
     * @param {object} plain
     * @returns {Account}
     */
    static fromPlain(plain) {
        if (!plain || plain.type === undefined) throw new Error('Invalid account');
        const type = Account.Type.fromAny(plain.type);
        return Account.TYPE_MAP.get(type).fromPlain(plain);
    }

    /**
     * @returns {object}
     */
    toPlain() {
        return {
            type: Account.Type.toString(this.type),
            balance: this.balance.toString()
        };
    }

    /**
     * @type {number} Account balance
     */
    get balance() {
        return this._balance;
    }

    /** @type {Account.Type} */
    get type() {
        return this._type;
    }

    /**
     * @param {BigNumber|number|string} balance
     * @return {Account|*}
     */
    withBalance(balance) { throw new Error('Not yet implemented.'); }

    /**
     * @param {Transaction} transaction
     * @param {number} blockHeight
     * @param {TransactionCache} transactionsCache
     * @param {boolean} [revert]
     * @return {Account}
     */
    withOutgoingTransaction(transaction, blockHeight, transactionsCache, revert = false) {
        if (!revert) {
            const newBalance = this._balance.minus(transaction.value).minus(transaction.fee);
            if (newBalance.lt(0)) {
                throw new Account.BalanceError();
            }
            if (blockHeight < transaction.validityStartHeight
                || blockHeight >= transaction.validityStartHeight + Policy.TRANSACTION_VALIDITY_WINDOW) {
                throw new Account.ValidityError();
            }
            if (transactionsCache.containsTransaction(transaction)) {
                throw new Account.DoubleTransactionError();
            }
            return this.withBalance(newBalance);
        } else {
            if (blockHeight < transaction.validityStartHeight
                || blockHeight >= transaction.validityStartHeight + Policy.TRANSACTION_VALIDITY_WINDOW) {
                throw new Account.ValidityError();
            }
            return this.withBalance(this._balance.plus(transaction.value).plus(transaction.fee));
        }
    }

    /**
     * @param {Transaction} transaction
     * @param {number} blockHeight
     * @param {boolean} [revert]
     * @return {Account}
     */
    withIncomingTransaction(transaction, blockHeight, revert = false) {
        if (!revert) {
            return this.withBalance(this._balance.plus(transaction.value));
        } else {
            const newBalance = this._balance.minus(transaction.value);
            if (newBalance.lt(0)) {
                throw new Account.BalanceError();
            }
            return this.withBalance(newBalance);
        }
    }

    /**
     * @param {Transaction} transaction
     * @param {number} blockHeight
     * @param {boolean} [revert]
     * @return {Account}
     */
    withContractCommand(transaction, blockHeight, revert = false) {
        throw new Error('Not yet implemented');
    }

    /**
     * @return {boolean}
     */
    isInitial() {
        return this === Account.INITIAL;
    }

    /**
     * @return {boolean}
     */
    isToBePruned() {
        return this._balance.eq(0) && !this.isInitial();
    }

    /**
     * @param {Uint8Array} data
     * @return {object}
     */
    static dataToPlain(data) {
        return {};
    }

    /**
     * @param {Uint8Array} proof
     * @return {object}
     */
    static proofToPlain(proof) {
        return {};
    }
}

/**
 * Enum for Account types.
 * Non-zero values are contracts.
 * @enum
 */
Account.Type = {
    /**
     * Basic account type.
     * @see {BasicAccount}
     */
    BASIC: 0,
    /**
     * Account with vesting functionality.
     * @see {VestingContract}
     */
    VESTING: 1,
    /**
     * Hashed Time-Locked Contract
     * @see {HashedTimeLockedContract}
     */
    HTLC: 2
};
/**
 * @param {Account.Type} type
 * @return {string}
 */
Account.Type.toString = function(type) {
    switch (type) {
        case Account.Type.BASIC: return 'basic';
        case Account.Type.VESTING: return 'vesting';
        case Account.Type.HTLC: return 'htlc';
    }
    throw new Error('Invalid account type');
};
/**
 * @param {Account.Type|string} type
 * @return {Account.Type}
 */
Account.Type.fromAny = function(type) {
    if (typeof type === 'number') return type;
    switch (type) {
        case 'basic': return Account.Type.BASIC;
        case 'vesting': return Account.Type.VESTING;
        case 'htlc': return Account.Type.HTLC;
    }
    throw new Error('Invalid account type');
};
/**
 * @type {Map.<Account.Type, {
 *  copy: function(o: *):Account,
 *  unserialize: function(buf: SerialBuffer):Account,
 *  create: function(balance: BigNumber|number|string, blockHeight: number, transaction: Transaction):Account,
 *  verifyOutgoingTransaction: function(transaction: Transaction):boolean,
 *  verifyIncomingTransaction: function(transaction: Transaction):boolean,
 *  fromPlain: function(o: object):Account,
 *  dataToPlain: function(data: Uint8Array):object,
 *  proofToPlain: function(proof: Uint8Array):object
 * }>}
 */
Account.TYPE_MAP = new Map();
Account.BalanceError = class extends Error { constructor() { super('Balance Error!'); }};
Account.DoubleTransactionError = class extends Error { constructor() { super('Double Transaction Error!'); }};
Account.ProofError = class extends Error { constructor() { super('Proof Error!'); }};
Account.ValidityError = class extends Error { constructor() { super('Validity Error!'); }};
Class.register(Account);
