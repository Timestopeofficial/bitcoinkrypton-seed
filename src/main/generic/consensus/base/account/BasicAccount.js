/**
 * This is a classic account that can send all his funds and receive any transaction.
 * All outgoing transactions are signed using the key corresponding to this address.
 */
class BasicAccount extends Account {
    /**
     * @param {BasicAccount} o
     * @returns {BasicAccount}
     */
    static copy(o) {
        if (!o) return o;
        return new BasicAccount(o._balance);
    }

    /**
     * @param {BigNumber|number|string} [balance]
     */
    constructor(balance = 0) {
        super(Account.Type.BASIC, balance);
    }

    /**
     * @param {SerialBuffer} buf
     * @return {BasicAccount}
     */
    static unserialize(buf) {
        const type = buf.readUint8();
        if (type !== Account.Type.BASIC) throw new Error('Invalid account type');

        const balance = buf.readUint128();
        return new BasicAccount(balance);
    }

    /**
     * @param {object} o
     */
    static fromPlain(o) {
        if (!o) throw new Error('Invalid account');
        return new BasicAccount(o.balance);
    }

    /**
     * Check if two Accounts are the same.
     * @param {Account} o Object to compare with.
     * @return {boolean} Set if both objects describe the same data.
     */
    equals(o) {
        return o instanceof BasicAccount
            && this._type === o._type
            && this._balance.eq(o._balance);
    }

    toString() {
        return `BasicAccount{balance=${this._balance.toString()}}`;
    }

    /**
     * @param {Transaction} transaction
     * @return {boolean}
     */
    static verifyOutgoingTransaction(transaction) {
        return SignatureProof.verifyTransaction(transaction);
    }

    /**
     * @param {Transaction} transaction
     * @return {boolean}
     */
    static verifyIncomingTransaction(transaction) {
        if (transaction.data.byteLength > 64) return false;
        return true;
    }

    /**
     * @param {BigNumber|number|string} balance
     * @return {Account|*}
     */
    withBalance(balance) {
        return new BasicAccount(balance);
    }

    /**
     * @param {Transaction} transaction
     * @param {number} blockHeight
     * @param {boolean} [revert]
     * @return {Account}
     */
    withIncomingTransaction(transaction, blockHeight, revert = false) {
        if (!revert) {
            const isContractCreation = transaction.hasFlag(Transaction.Flag.CONTRACT_CREATION);
            const isTypeChange = transaction.recipientType !== this._type;
            if (isContractCreation !== isTypeChange) {
                throw new Error('Data Error!');
            }
        }
        return super.withIncomingTransaction(transaction, blockHeight, revert);
    }

    /**
     * @param {Transaction} transaction
     * @param {number} blockHeight
     * @param {boolean} [revert]
     * @return {Account}
     */
    withContractCommand(transaction, blockHeight, revert = false) {
        if (!revert && transaction.recipientType !== this._type && transaction.hasFlag(Transaction.Flag.CONTRACT_CREATION)) {
            // Contract creation
            return Account.TYPE_MAP.get(transaction.recipientType).create(this._balance, blockHeight, transaction);
        }
        return this;
    }

    /**
     * @return {boolean}
     */
    isInitial() {
        return this._balance && this._balance.eq(0);
    }

    /**
     * @param {Uint8Array} data
     * @return {object}
     */
    static dataToPlain(data) {
        return Account.dataToPlain(data);
    }

    /**
     * @param {Uint8Array} proof
     * @return {object}
     */
    static proofToPlain(proof) {
        try {
            const signatureProof = SignatureProof.unserialize(new SerialBuffer(proof));
            return {
                signature: signatureProof.signature.toHex(),
                publicKey: signatureProof.publicKey.toHex(),
                signer: signatureProof.publicKey.toAddress().toPlain(),
                pathLength: signatureProof.merklePath.nodes.length
            };
        } catch (e) {
            return Account.proofToPlain(proof);
        }
    }
}

Account.INITIAL = new BasicAccount(0);
Account.TYPE_MAP.set(Account.Type.BASIC, BasicAccount);
Class.register(BasicAccount);
