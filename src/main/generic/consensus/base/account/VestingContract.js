class VestingContract extends Contract {
    /**
     * @param {BigNumber|number|string} [balance]
     * @param {Address} [owner]
     * @param {number} [vestingStart]
     * @param {number} [vestingStepBlocks]
     * @param {BigNumber|number|string} [vestingStepAmount]
     * @param {BigNumber|number|string} [vestingTotalAmount]
     */
    constructor(balance = 0, owner = Address.NULL, vestingStart = 0, vestingStepBlocks = 0, vestingStepAmount = balance, vestingTotalAmount = balance) {
        super(Account.Type.VESTING, balance);
        const bigVestingStepAmount = new BigNumber(vestingStepAmount);
        const bigVestingTotalAmount = new BigNumber(vestingTotalAmount);
        if (!(owner instanceof Address)) throw new Error('Malformed owner address');
        if (!NumberUtils.isUint32(vestingStart)) throw new Error('Malformed vestingStart');
        if (!NumberUtils.isUint32(vestingStepBlocks)) throw new Error('Malformed vestingStepBlocks');
        if (!NumberUtils.isUint128(bigVestingStepAmount)) throw new Error('Malformed vestingStepAmount');
        if (!NumberUtils.isUint128(bigVestingTotalAmount)) throw new Error('Malformed vestingTotalAmount');

        /** @type {Address} */
        this._owner = owner;
        /** @type {number} */
        this._vestingStart = vestingStart;
        /** @type {number} */
        this._vestingStepBlocks = vestingStepBlocks;
        /** @type {BigNumber} */
        this._vestingStepAmount = bigVestingStepAmount;
        /** @type {BigNumber} */
        this._vestingTotalAmount = bigVestingTotalAmount;
    }

    /**
     * @param {BigNumber|number|string} balance
     * @param {number} blockHeight
     * @param {Transaction} transaction
     */
    static create(balance, blockHeight, transaction) {
        /** @type {number} */
        let vestingStart, vestingStepBlocks, vestingStepAmount, vestingTotalAmount;
        const buf = new SerialBuffer(transaction.data);
        const owner = Address.unserialize(buf);
        vestingTotalAmount = transaction.value;
        switch (transaction.data.length) {
            case Address.SERIALIZED_SIZE + 4:
                // Only block number: vest full amount at that block
                vestingStart = 0;
                vestingStepBlocks = buf.readUint32();
                vestingStepAmount = vestingTotalAmount;
                break;
            case Address.SERIALIZED_SIZE + 24:
                vestingStart = buf.readUint32();
                vestingStepBlocks = buf.readUint32();
                vestingStepAmount = buf.readUint128();
                break;
            case Address.SERIALIZED_SIZE + 40:
                // Create a vesting account with some instantly vested funds or additional funds considered.
                vestingStart = buf.readUint32();
                vestingStepBlocks = buf.readUint32();
                vestingStepAmount = buf.readUint128();
                vestingTotalAmount = buf.readUint128();
                break;
            default:
                throw new Error('Invalid transaction data');
        }
        return new VestingContract(balance, owner, vestingStart, vestingStepBlocks, vestingStepAmount, vestingTotalAmount);
    }

    /**
     * @param {SerialBuffer} buf
     * @return {VestingContract}
     */
    static unserialize(buf) {
        const type = buf.readUint8();
        if (type !== Account.Type.VESTING) throw new Error('Invalid account type');

        const balance = buf.readUint128();
        const owner = Address.unserialize(buf);
        const vestingStart = buf.readUint32();
        const vestingStepBlocks = buf.readUint32();
        const vestingStepAmount = buf.readUint128();
        const vestingTotalAmount = buf.readUint128();
        return new VestingContract(balance, owner, vestingStart, vestingStepBlocks, vestingStepAmount, vestingTotalAmount);
    }

    /**
     * @param {object} plain
     */
    static fromPlain(plain) {
        if (!plain) throw new Error('Invalid account');
        return new VestingContract(plain.balance, Address.fromAny(plain.owner), plain.vestingStart, plain.vestingStepBlocks, plain.vestingStepAmount, plain.vestingTotalAmount);
    }

    /**
     * Serialize this VestingContract object into binary form.
     * @param {?SerialBuffer} [buf] Buffer to write to.
     * @return {SerialBuffer} Buffer from `buf` or newly generated one.
     */
    serialize(buf) {
        buf = buf || new SerialBuffer(this.serializedSize);
        super.serialize(buf);
        this._owner.serialize(buf);
        buf.writeUint32(this._vestingStart);
        buf.writeUint32(this._vestingStepBlocks);
        buf.writeUint128(this._vestingStepAmount);
        buf.writeUint128(this._vestingTotalAmount);
        return buf;
    }

    /**
     * @return {number}
     */
    get serializedSize() {
        return super.serializedSize
            + this._owner.serializedSize
            + /*vestingStart*/ 4
            + /*vestingStepBlocks*/ 4
            + /*vestingStepAmount*/ 16
            + /*vestingTotalAmount*/ 16;
    }

    /** @type {Address} */
    get owner() {
        return this._owner;
    }

    /** @type {number} */
    get vestingStart() {
        return this._vestingStart;
    }

    /** @type {number} */
    get vestingStepBlocks() {
        return this._vestingStepBlocks;
    }

    /** @type {BigNumber} */
    get vestingStepAmount() {
        return this._vestingStepAmount;
    }

    /** @type {BigNumber} */
    get vestingTotalAmount() {
        return this._vestingTotalAmount;
    }

    toString() {
        return `VestingAccount{balance=${this._balance.toString()}, owner=${this._owner.toUserFriendlyAddress()}`;
    }

    /**
     * @returns {object}
     */
    toPlain() {
        const plain = super.toPlain();
        plain.owner = this.owner.toPlain();
        plain.vestingStart = this.vestingStart;
        plain.vestingStepBlocks = this.vestingStepBlocks;
        plain.vestingStepAmount = this.vestingStepAmount.toString();
        plain.vestingTotalAmount = this.vestingTotalAmount.toString();
        return plain;
    }

    /**
     * Check if two Accounts are the same.
     * @param {Account} o Object to compare with.
     * @return {boolean} Set if both objects describe the same data.
     */
    equals(o) {
        return o instanceof VestingContract
            && this._type === o._type
            && this._balance.eq(o._balance)
            && this._owner.equals(o._owner)
            && this._vestingStart === o._vestingStart
            && this._vestingStepBlocks === o._vestingStepBlocks
            && this._vestingStepAmount.eq(o._vestingStepAmount)
            && this._vestingTotalAmount.eq(o._vestingTotalAmount);
    }

    /**
     * @param {Transaction} transaction
     * @return {boolean}
     */
    static verifyOutgoingTransaction(transaction) {
        const buf = new SerialBuffer(transaction.proof);

        if (!SignatureProof.unserialize(buf).verify(null, transaction.serializeContent())) {
            return false;
        }

        if (buf.readPos !== buf.byteLength) {
            return false;
        }

        return true;
    }

    /**
     * @param {Transaction} transaction
     * @return {boolean}
     */
    static verifyIncomingTransaction(transaction) {
        switch (transaction.data.length) {
            case Address.SERIALIZED_SIZE + 4:
            case Address.SERIALIZED_SIZE + 24:
            case Address.SERIALIZED_SIZE + 40:
                return Contract.verifyIncomingTransaction(transaction);
            default:
                return false;
        }
    }

    /**
     * @param {BigNumber|number|string} balance
     * @return {Account|*}
     */
    withBalance(balance) {
        return new VestingContract(balance, this._owner, this._vestingStart, this._vestingStepBlocks, this._vestingStepAmount, this._vestingTotalAmount);
    }

    /**
     * @param {Transaction} transaction
     * @param {number} blockHeight
     * @param {TransactionCache} transactionsCache
     * @param {boolean} [revert]
     * @return {Account|*}
     */
    withOutgoingTransaction(transaction, blockHeight, transactionsCache, revert = false) {
        if (!revert) {
            const minCap = this.getMinCap(blockHeight);
            const newBalance = this._balance.minus(transaction.value).minus(transaction.fee);
            if (newBalance.lt(minCap)) {
                throw new Account.BalanceError();
            }

            const buf = new SerialBuffer(transaction.proof);
            if (!SignatureProof.unserialize(buf).isSignedBy(this._owner)) {
                throw new Account.ProofError();
            }
        }
        return super.withOutgoingTransaction(transaction, blockHeight, transactionsCache, revert);
    }

    /**
     * @param {Transaction} transaction
     * @param {number} blockHeight
     * @param {boolean} [revert]
     * @return {Account}
     */
    withIncomingTransaction(transaction, blockHeight, revert = false) {
        throw new Error('Illegal incoming transaction');
    }

    /**
     * @param {number} blockHeight
     * @returns {number}
     */
    getMinCap(blockHeight) {
        return this._vestingStepBlocks && this._vestingStepAmount.gt(0)
        ? BigNumber.max(0, this._vestingTotalAmount.minus(this._vestingStepAmount.times(Math.floor((blockHeight - this._vestingStart) / this._vestingStepBlocks))))
        : new BigNumber(0);
    }


    /**
     * @param {Uint8Array} data
     * @return {object}
     */
    static dataToPlain(data) {
        try {
            let vestingStart, vestingStepBlocks, vestingStepAmount, vestingTotalAmount;
            const buf = new SerialBuffer(data);
            const owner = Address.unserialize(buf);
            switch (data.length) {
                case Address.SERIALIZED_SIZE + 4:
                    vestingStart = 0;
                    vestingStepBlocks = buf.readUint32();
                    break;
                case Address.SERIALIZED_SIZE + 24:
                    vestingStart = buf.readUint32();
                    vestingStepBlocks = buf.readUint32();
                    vestingStepAmount = buf.readUint128().toString();
                    break;
                case Address.SERIALIZED_SIZE + 40:
                    vestingStart = buf.readUint32();
                    vestingStepBlocks = buf.readUint32();
                    vestingStepAmount = buf.readUint128().toString();
                    vestingTotalAmount = buf.readUint128().toString();
                    break;
                default:
                    throw new Error('Invalid transaction data');
            }
            return {
                owner: owner.toPlain(),
                vestingStart,
                vestingStepBlocks,
                vestingStepAmount,
                vestingTotalAmount
            };
        } catch (e) {
            return Account.dataToPlain(data);
        }
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

Account.TYPE_MAP.set(Account.Type.VESTING, VestingContract);
Class.register(VestingContract);
