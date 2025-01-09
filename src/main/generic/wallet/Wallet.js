class Wallet {
    /**
     * Create a new Wallet.
     * @returns {Wallet} Newly created Wallet.
     */
    static generate() {
        return new Wallet(KeyPair.generate());
    }

    /**
     * @param {Uint8Array|string} buf
     * @return {Wallet}
     */
    static loadPlain(buf) {
        if (typeof buf === 'string') buf = BufferUtils.fromHex(buf);
        if (!buf || buf.byteLength === 0) {
            throw new Error('Invalid wallet seed');
        }
        return new Wallet(KeyPair.unserialize(new SerialBuffer(buf)));
    }

     /**
     * @param {string} buf
     * @return {Wallet}
     */
    static importPrivateKey(buf) {
        if (typeof buf === 'string') buf = BufferUtils.fromHex(buf, 32);
        if (!buf || buf.byteLength < PrivateKey.SIZE) {
            return null;
        }
        const privateKey = PrivateKey.unserialize(new SerialBuffer(buf));
        const publicKey = PublicKey.derive(privateKey);

        return new Wallet(new KeyPair(privateKey, publicKey));
    }

     /**
     * @param {string} buf
     * @return {Wallet}
     */
    static importFromSeed(buf) {
        // if (/[^A-HJ-NP-Za-km-z1-9]/.exec(buf)) return null;

        buf = BufferUtils.fromHex(buf);
        if (!buf || buf.byteLength != PrivateKey.SIZE) {
            return null;
        }

        // const privBuf = buf.subarray(0, PrivateKey.SIZE);
        const privateKey = PrivateKey.unserialize(new SerialBuffer(buf));
        const publicKey = PublicKey.derive(privateKey);
        // const publicKeyBase58 = publicKey.toBase58();

        // const pubBuf = buf.subarray(PrivateKey.SIZE);
        // const check = PublicKey.unserialize(new SerialBuffer(pubBuf)).toBase58();
        // if (publicKeyBase58 !== check) return null;

        return new Wallet(new KeyPair(privateKey, publicKey));
    }
    /**
     * @param {Uint8Array|string} buf
     * @param {Uint8Array|string} key
     * @return {Promise.<Wallet>}
     */
    static async loadEncrypted(buf, key) {
        if (typeof buf === 'string') buf = BufferUtils.fromHex(buf);
        if (typeof key === 'string') key = BufferUtils.fromUtf8(key);
        return new Wallet(await KeyPair.fromEncrypted(new SerialBuffer(buf), key));
    }

    /**
     * Create a new Wallet object.
     * @param {KeyPair} keyPair KeyPair owning this Wallet.
     * @returns {Wallet} A newly generated Wallet.
     */
    constructor(keyPair) {
        /** @type {KeyPair} */
        this._keyPair = keyPair;
        /** @type {Address} */
        this._address = this._keyPair.publicKey.toAddress();
    }

    /**
     * Create a Transaction that is signed by the owner of this Wallet.
     * @param {Address} recipient Address of the transaction receiver
     * @param {BigNumber|number|string} value Number of Satoshis to send.
     * @param {number} validityStartHeight The validityStartHeight for the transaction.
     * @returns {Transaction} A prepared and signed Transaction object. This still has to be sent to the network.
     */
    createTransaction(recipient, value, validityStartHeight) {
        const transaction = new BasicTransaction(this._keyPair.publicKey, recipient, value, validityStartHeight);
        transaction.signature = Signature.create(this._keyPair.privateKey, this._keyPair.publicKey, transaction.serializeContent());
        return transaction;
    }

    /**
     * Sign a transaction by the owner of this Wallet.
     * @param {Transaction} transaction The transaction to sign.
     * @returns {SignatureProof} A signature proof for this transaction.
     */
    signTransaction(transaction) {
        const signature = Signature.create(this._keyPair.privateKey, this._keyPair.publicKey, transaction.serializeContent());
        return SignatureProof.singleSig(this._keyPair.publicKey, signature);
    }

    /**
     * @returns {Uint8Array}
     */
    exportPlain() {
        return this._keyPair.serialize();
    }

    /**
     * @param {Uint8Array|string} key
     * @return {Promise.<SerialBuffer>}
     */
    exportEncrypted(key) {
        if (typeof key === 'string') key = BufferUtils.fromUtf8(key);
        return this._keyPair.exportEncrypted(key);
    }

    /** @type {boolean} */
    get isLocked() {
        return this.keyPair.isLocked;
    }

    /**
     * @param {Uint8Array|string} key
     * @returns {Promise.<void>}
     */
    lock(key) {
        if (typeof key === 'string') key = BufferUtils.fromUtf8(key);
        return this.keyPair.lock(key);
    }

    relock() {
        this.keyPair.relock();
    }

    /**
     * @param {Uint8Array|string} key
     * @returns {Promise.<void>}
     */
    unlock(key) {
        if (typeof key === 'string') key = BufferUtils.fromUtf8(key);
        return this.keyPair.unlock(key);
    }

    /**
     * @param {Wallet} o
     * @return {boolean}
     */
    equals(o) {
        return o instanceof Wallet && this.keyPair.equals(o.keyPair) && this.address.equals(o.address);
    }

    /**
     * The address of the Wallet owner.
     * @type {Address}
     */
    get address() {
        return this._address;
    }

    /**
     * The public key of the Wallet owner
     * @type {PublicKey}
     */
    get publicKey() {
        return this._keyPair.publicKey;
    }

    /** @type {KeyPair} */
    get keyPair() {
        return this._keyPair;
    }
}

Class.register(Wallet);
