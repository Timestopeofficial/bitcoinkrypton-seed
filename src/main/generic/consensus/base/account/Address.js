class Address extends Serializable {
    /**
     * @param {Address} o
     * @returns {Address}
     */
    static copy(o) {
        if (!o) return o;
        const obj = new Uint8Array(o._obj);
        return new Address(obj);
    }

    /**
     * @param {Hash} hash
     * @returns {Address}
     */
    static fromHash(hash) {
        return new Address(hash.subarray(-Address.SERIALIZED_SIZE));
    }

    constructor(arg) {
        super();
        if (!(arg instanceof Uint8Array)) throw new Error('Primitive: Invalid type');
        if (arg.length !== Address.SERIALIZED_SIZE) throw new Error('Primitive: Invalid length');
        this._obj = arg;
    }

    /**
     * Create Address object from binary form.
     * @param {SerialBuffer} buf Buffer to read from.
     * @return {Address} Newly created Account object.
     */
    static unserialize(buf) {
        return new Address(buf.read(Address.SERIALIZED_SIZE));
    }

    /**
     * Serialize this Address object into binary form.
     * @param {?SerialBuffer} [buf] Buffer to write to.
     * @return {SerialBuffer} Buffer from `buf` or newly generated one.
     */
    serialize(buf) {
        buf = buf || new SerialBuffer(this.serializedSize);
        buf.write(this._obj);
        return buf;
    }

    /**
     * @param {number} [begin]
     * @param {number} [end]
     * @returns {Uint8Array}
     */
    subarray(begin, end) {
        return this._obj.subarray(begin, end);
    }

    /**
     * @type {number}
     */
    get serializedSize() {
        return Address.SERIALIZED_SIZE;
    }

    /**
     * @param {Serializable} o
     * @return {boolean}
     */
    equals(o) {
        return o instanceof Address
            && super.equals(o);
    }

    /**
     * @param {Address|string} addr
     */
    static fromAny(addr) {
        if (addr instanceof Address) return addr;
        if (typeof addr === 'string') return Address.fromString(addr);
        throw new Error('Invalid address format');
    }

    /**
     * @returns {string}
     */
    toPlain() {
        return this.toUserFriendlyAddress();
    }

    static fromString(str) {
        try {
            return Address.fromUserFriendlyAddress(str);
        } catch (e) {
            // Ignore
        }

        try {
            return Address.fromHex(str);
        } catch (e) {
            // Ignore
        }

        try {
            return Address.fromBase64(str);
        } catch (e) {
            // Ignore
        }

        throw new Error('Invalid address format');
    }

    /**
     * @param {string} base64
     * @return {Address}
     */
    static fromBase64(base64) {
        return new Address(BufferUtils.fromBase64(base64));
    }

    /**
     * @param {string} hex
     * @return {Address}
     */
    static fromHex(hex) {
        return new Address(BufferUtils.fromHex(hex));
    }

    /**
     * @param {string} str
     * @return {Address}
     */
    static fromBech32(str) {
        if (!this.isBech32Address(str)) {
            throw new Error('Invalid Bech32 Address');
        }

        return new Address(Bech32.fromBech32(str));
    }

    /**
     * @param {string} str
     * @return {Address}
     */
    static fromUserFriendlyAddress(str) {
        return Address.fromHex(str);
    }

    /**
     * @return {string}
     */
    toBech32() {
        return Bech32.toBech32(this.serialize());
    }

    /**
     * @param {boolean} [withSpaces]
     * @return {string}
     */
    toUserFriendlyAddress(withSpaces = true) {
        return this.toHex();
    }

    /**
     * @param {string} [addr]
     * @return {boolean}
     */
    static isBech32Address(addr) {
        return Bech32.isBech32Address(addr);
    }
}

Address.SERIALIZED_SIZE = 20;
Address.HEX_SIZE = 40;
Address.NULL = new Address(new Uint8Array(Address.SERIALIZED_SIZE));
Address.CONTRACT_CREATION = new Address(new Uint8Array(Address.SERIALIZED_SIZE));
Class.register(Address);
