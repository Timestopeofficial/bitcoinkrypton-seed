/**
 * @abstract
 */
class Serializable {
    /**
     * @param {Serializable} o
     * @return {boolean}
     */
    equals(o) {
        return o instanceof Serializable && BufferUtils.equals(this.serialize(), o.serialize());
    }

    /**
     * @param {Serializable} o
     * @return {number} negative if this is smaller than o, positive if this is larger than o, zero if equal.
     */
    compare(o) {
        return BufferUtils.compare(this.serialize(), o.serialize());
    }

    hashCode() {
        return this.toBase64();
    }

    /**
     * @abstract
     * @param {SerialBuffer} [buf]
     */
    serialize(buf) {}

    /**
     * @return {string}
     */
    toString() {
        return this.toBase64();
    }

    /**
     * @return {string}
     */
    toBase64() {
        return BufferUtils.toBase64(this.serialize());
    }

    /**
     * @return {string}
     */
    toHex() {
        return BufferUtils.toHex(this.serialize());
    }

    /**
     * @return {string}
     */
    toBase58() {
        return BufferUtils.toBase58(this.serialize());
    }

    /**
     * @param {number}
     * @return {string}
     */
    toBase58Check(prefix = 0x80, suffix) {
        return BufferUtils.toBase58Check(this.serialize(), prefix, suffix);
    }
}

Class.register(Serializable);
