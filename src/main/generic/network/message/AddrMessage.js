class AddrMessage extends Message {
    /**
     * @param {Array.<PeerAddress>} addresses
     */
    constructor(addresses) {
        super(Message.Type.ADDR);
        if (!addresses || !NumberUtils.isUint16(addresses.length)
            || addresses.length > AddrMessage.ADDRESSES_MAX_COUNT
            || addresses.some(it => !(it instanceof PeerAddress))) throw new Error('Malformed addresses');
        this._addresses = addresses;
    }

    /**
     * @param {SerialBuffer} buf
     * @return {AddrMessage}
     */
    static unserialize(buf) {
        Message.unserialize(buf);
        const count = buf.readUint16();
        if (count > AddrMessage.ADDRESSES_MAX_COUNT) throw new Error('Malformed count');
        const addresses = new Array(count);
        for (let i = 0; i < count; i++) {
            addresses[i] = PeerAddress.unserialize(buf);
        }
        return new AddrMessage(addresses);
    }

    /**
     * @param {SerialBuffer} [buf]
     * @return {SerialBuffer}
     */
    serialize(buf) {
        buf = buf || new SerialBuffer(this.serializedSize);
        super.serialize(buf);
        buf.writeUint16(this._addresses.length);
        for (const addr of this._addresses) {
            addr.serialize(buf);
        }
        super._setChecksum(buf);
        return buf;
    }

    /** @type {number} */
    get serializedSize() {
        let size = super.serializedSize
            + /*count*/ 2;
        for (const addr of this._addresses) {
            size += addr.serializedSize;
        }
        return size;
    }

    /** @type {Array.<PeerAddress>} */
    get addresses() {
        return this._addresses;
    }

    toString() {
        return `AddrMessage{size=${this._addresses.length}}`;
    }
}
AddrMessage.ADDRESSES_MAX_COUNT = 1000;
Class.register(AddrMessage);
