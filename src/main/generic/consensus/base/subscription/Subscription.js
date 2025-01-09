class Subscription {
    /**
     * @param {Array.<Address>} addresses
     */
    static fromAddresses(addresses) {
        return new Subscription(Subscription.Type.ADDRESSES, addresses);
    }

    /**
     * @param {Subscription.Type} type
     * @param {Array.<Address>|number} [filter]
     */
    constructor(type, filter=null) {
        if (!NumberUtils.isUint8(type)) throw new Error('Invalid type');
        if (type === Subscription.Type.ADDRESSES
            && (!Array.isArray(filter) || !NumberUtils.isUint16(filter.length)
            || filter.some(it => !(it instanceof Address)))) throw new Error('Invalid addresses');
        this._type = type;

        this._addresses = new HashSet();

        switch (type) {
            case Subscription.Type.ADDRESSES:
                this._addresses.addAll(filter);
                break;
        }
    }

    /**
     * @param {SerialBuffer} buf
     * @return {Subscription}
     */
    static unserialize(buf) {
        const type = /** @type {Subscription.Type} */ buf.readUint8();
        let filter = null;
        switch (type) {
            case Subscription.Type.ADDRESSES: {
                filter = [];
                const size = buf.readUint16();
                for (let i = 0; i < size; ++i) {
                    filter.push(Address.unserialize(buf));
                }
                break;
            }
        }
        return new Subscription(type, filter);
    }

    /**
     * @param {SerialBuffer} [buf]
     * @return {SerialBuffer}
     */
    serialize(buf) {
        buf = buf || new SerialBuffer(this.serializedSize);
        buf.writeUint8(this._type);
        switch (this._type) {
            case Subscription.Type.ADDRESSES:
                buf.writeUint16(this._addresses.length);
                for (const address of this._addresses) {
                    address.serialize(buf);
                }
                break;
        }
        return buf;
    }

    /** @type {number} */
    get serializedSize() {
        let additionalSize = 0;
        switch (this._type) {
            case Subscription.Type.ADDRESSES:
                additionalSize = /*length*/ 2;
                for (const address of this._addresses) {
                    additionalSize += address.serializedSize;
                }
                break;
        }
        return /*type*/ 1
            + additionalSize;
    }

    /**
     * @param {Block} block
     * @returns {boolean}
     */
    matchesBlock(block) {
        switch (this._type) {
            case Subscription.Type.NONE:
                return false;
            case Subscription.Type.ANY:
            case Subscription.Type.ADDRESSES:
                return true;
            default:
                throw new Error('Unknown type');
        }
    }

    /**
     * @param {Transaction} transaction
     * @returns {boolean}
     */
    matchesTransaction(transaction) {
        switch (this._type) {
            case Subscription.Type.NONE:
                return false;
            case Subscription.Type.ANY:
                return true;
            case Subscription.Type.ADDRESSES:
                return this._addresses.contains(transaction.recipient) || this._addresses.contains(transaction.sender);
            default:
                throw new Error('Unknown type');
        }
    }

    /**
     * @param {Subscription} other
     * @returns {boolean}
     */
    isSubsetOf(other) {
        if (other.type === Subscription.Type.ANY || this.type === Subscription.Type.NONE) {
            return true;
        }
        if (other.type !== this.type) {
            return false;
        }
        switch (this.type) {
            case Subscription.Type.ADDRESSES:
                return this.addresses.reduce((isSubset, address) => isSubset && other.addresses.find(a => a.equals(address)), true);
        }
        return false;
    }

    /**
     * @returns {string}
     */
    toString() {
        return `Subscription{type=${this._type}, addresses=[${this._addresses.values()}]}`;
    }

    /** @type {Subscription.Type} */
    get type() {
        return this._type;
    }

    /** @type {Array.<Address>} */
    get addresses() {
        return this._addresses.values();
    }
}
/** @enum {number} */
Subscription.Type = {
    NONE: 0,
    ANY: 1,
    ADDRESSES: 2
};
Subscription.NONE = new Subscription(Subscription.Type.NONE);
Subscription.BLOCKS_ONLY = new Subscription(Subscription.Type.ADDRESSES, []);
Subscription.ANY = new Subscription(Subscription.Type.ANY);
Class.register(Subscription);
