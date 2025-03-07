class PublicKey extends Serializable {
    /**
     * @param {PublicKey} o
     * @returns {PublicKey}
     */
    static copy(o) {
        if (!o) return o;
        return new PublicKey(new Uint8Array(o._obj));
    }

    /**
     * @param {Uint8Array} arg
     * @private
     */
    constructor(arg) {
        super();
        if (!(arg instanceof Uint8Array)) throw new Error('Primitive: Invalid type');
        if (arg.length !== PublicKey.SIZE) throw new Error('Primitive: Invalid length');
        this._obj = arg;
    }

    /**
     * @param {PrivateKey} privateKey
     * @return {PublicKey}
     */
    static derive(privateKey) {
        return new PublicKey(PublicKey._publicKeyDerive(privateKey._obj));
    }

    /**
     * @return {Uint8Array}
     */
    compress() {
        return PublicKey._compressPublicKey(this._obj);
    }

    /**
     * @param {Array.<PublicKey>} publicKeys
     * @return {PublicKey}
     */
    static sum(publicKeys) {
        publicKeys = publicKeys.slice();
        publicKeys.sort((a, b) => a.compare(b));
        return PublicKey._delinearizeAndAggregatePublicKeys(publicKeys);
    }

    /**
     * @param {SerialBuffer} buf
     * @return {PublicKey}
     */
    static unserialize(buf) {
        return new PublicKey(buf.read(PublicKey.SIZE));
    }

    /**
     * @param {PublicKey|Uint8Array|string} o
     * @return {PublicKey}
     */
    static fromAny(o) {
        if (!o) throw new Error('Invalid public key format');
        if (o instanceof PublicKey) return o;
        try {
            return new PublicKey(BufferUtils.fromAny(o, PublicKey.SIZE));
        } catch (e) {
            throw new Error('Invalid public key format');
        }
    }

    /**
     * @param {SerialBuffer} [buf]
     * @return {SerialBuffer}
     */
    serialize(buf) {
        buf = buf || new SerialBuffer(this.serializedSize);
        buf.write(this._obj);
        return buf;
    }

    /** @type {number} */
    get serializedSize() {
        return PublicKey.SIZE;
    }

    /**
     * @param {Serializable} o
     * @return {boolean}
     */
    equals(o) {
        return o instanceof PublicKey && super.equals(o);
    }

    /**
     * @return {Hash}
     */
    hash() {
        return Hash.keccak256(this.serialize().slice(1)); // skip the type byte
    }

    /**
     * @param {PublicKey} o
     * @return {number}
     */
    compare(o) {
        return BufferUtils.compare(this._obj, o._obj);
    }

    /**
     * @return {Address}
     */
    toAddress() {
        return Address.fromHash(this.hash());
    }

    /**
     * @return {PeerId}
     */
    toPeerId() {
        return new PeerId(this.hash().subarray(0, 16));
    }

    /**
     * @param {Array.<PublicKey>} publicKeys
     * @returns {PublicKey}
     */
    static _delinearizeAndAggregatePublicKeys(publicKeys) {
        const publicKeysObj = publicKeys.map(k => k.serialize());
        const publicKeysHash = PublicKey._publicKeysHash(publicKeysObj);
        const raw = PublicKey._publicKeysDelinearizeAndAggregate(publicKeysObj, publicKeysHash);
        return new PublicKey(raw);
    }

    /**
     * @param {Uint8Array} publicKey
     * @returns {Uint8Array}
     */
    static _compressPublicKey(publicKey) {
        if (publicKey.byteLength !== PublicKey.SIZE) {
            throw Error('Wrong buffer size.');
        }
        const randomize = new Uint8Array(32);
        CryptoWorker.lib.getRandomValues(randomize);
        if (PlatformUtils.isNodeJs()) {
            NodeNative.node_secp256k1_ctx_init(randomize);
            const out = new Uint8Array(PublicKey.COMPRESSED_SIZE);
            NodeNative.node_secp256k1_pubkey_compress(out, new Uint8Array(publicKey));
            NodeNative.node_secp256k1_ctx_release();
            return out;
        } else {
            let stackPtr;
            try {
                stackPtr = Module.stackSave();
                const rdm = Module.stackAlloc(32);
                new Uint8Array(Module.HEAP8.buffer, rdm, 32).set(randomize);
                Module._secp256k1_ctx_init(rdm);

                const wasmOut = Module.stackAlloc(PublicKey.COMPRESSED_SIZE);
                const pubKeyBufferOut = new Uint8Array(Module.HEAP8.buffer, wasmOut, PublicKey.COMPRESSED_SIZE);
                
                const wasmIn = Module.stackAlloc(PublicKey.SIZE);
                const pubKeyBufferIn = new Uint8Array(Module.HEAP8.buffer, wasmIn, PublicKey.SIZE);
                pubKeyBufferIn.set(publicKey);

                Module._secp256k1_pubkey_compress(wasmOut, wasmIn);
                const compressed = new Uint8Array(PublicKey.COMPRESSED_SIZE);
                compressed.set(pubKeyBufferOut);
                return compressed;
            } catch (e) {
                Log.w(PublicKey, e);
                throw e;
            } finally {
                Module._secp256k1_ctx_release();
                if (stackPtr !== undefined) Module.stackRestore(stackPtr);
            }
        }
    }

    /**
     * @param {Uint8Array} privateKey
     * @returns {Uint8Array}
     */
    static _publicKeyDerive(privateKey) {
        if (privateKey.byteLength !== PrivateKey.SIZE) {
            throw Error('Wrong buffer size.');
        }
        const randomize = new Uint8Array(32);
        CryptoWorker.lib.getRandomValues(randomize);
        if (PlatformUtils.isNodeJs()) {
            NodeNative.node_secp256k1_ctx_init(randomize);
            const out = new Uint8Array(PublicKey.SIZE);
            NodeNative.node_secp256k1_pubkey_create(out, new Uint8Array(privateKey));
            NodeNative.node_secp256k1_ctx_release();
            return out;
        } else {
            let stackPtr;
            try {
                stackPtr = Module.stackSave();
                const rdm = Module.stackAlloc(32);
                new Uint8Array(Module.HEAP8.buffer, rdm, 32).set(randomize);
                Module._secp256k1_ctx_init(rdm);

                const wasmOut = Module.stackAlloc(PublicKey.SIZE);
                const pubKeyBuffer = new Uint8Array(Module.HEAP8.buffer, wasmOut, PublicKey.SIZE);
                
                const wasmIn = Module.stackAlloc(privateKey.length);
                const privKeyBuffer = new Uint8Array(Module.HEAP8.buffer, wasmIn, PrivateKey.SIZE);
                privKeyBuffer.set(privateKey);

                Module._secp256k1_pubkey_create(wasmOut, PublicKey.SIZE, wasmIn);
                privKeyBuffer.fill(0);
                const publicKey = new Uint8Array(PublicKey.SIZE);
                publicKey.set(pubKeyBuffer);
                return publicKey;
            } catch (e) {
                Log.w(PublicKey, e);
                throw e;
            } finally {
                Module._secp256k1_ctx_release();
                if (stackPtr !== undefined) Module.stackRestore(stackPtr);
            }
        }
    }

    /**
     * @param {Array.<Uint8Array>} publicKeys
     * @returns {Uint8Array}
     */
    static _publicKeysHash(publicKeys) {
        if (publicKeys.some(publicKey => publicKey.byteLength !== PublicKey.SIZE)) {
            throw Error('Wrong buffer size.');
        }
        const concatenatedPublicKeys = new Uint8Array(publicKeys.length * PublicKey.SIZE);
        for (let i = 0; i < publicKeys.length; ++i) {
            concatenatedPublicKeys.set(publicKeys[i], i * PublicKey.SIZE);
        }
        if (PlatformUtils.isNodeJs()) {
            const out = new Uint8Array(Hash.getSize(Hash.Algorithm.SHA256));
            NodeNative.node_secp256k1_hash_pubkeys(out, concatenatedPublicKeys, publicKeys.length, PublicKey.SIZE);
            return out;
        } else {
            let stackPtr;
            try {
                stackPtr = Module.stackSave();
                const hashSize = Hash.getSize(Hash.Algorithm.SHA256);
                const wasmOut = Module.stackAlloc(hashSize);
                const wasmInPublicKeys = Module.stackAlloc(concatenatedPublicKeys.length);
                new Uint8Array(Module.HEAPU8.buffer, wasmInPublicKeys, concatenatedPublicKeys.length).set(concatenatedPublicKeys);
                Module._secp256k1_hash_pubkeys(wasmOut, wasmInPublicKeys, publicKeys.length, PublicKey.SIZE);
                const hashedPublicKey = new Uint8Array(hashSize);
                hashedPublicKey.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, hashSize));
                return hashedPublicKey;
            } catch (e) {
                Log.w(PublicKey, e);
                throw e;
            } finally {
                if (stackPtr !== undefined) Module.stackRestore(stackPtr);
            }
        }
    }

    /**
     * @param {Uint8Array} publicKey
     * @param {Uint8Array} publicKeysHash
     * @returns {Uint8Array}
     */
    static _publicKeyDelinearize(publicKey, publicKeysHash) {
        if (publicKey.byteLength !== PublicKey.SIZE
            || publicKeysHash.byteLength !== Hash.getSize(Hash.Algorithm.SHA256)) {
            throw Error('Wrong buffer size.');
        }
        if (PlatformUtils.isNodeJs()) {
            const out = new Uint8Array(PublicKey.SIZE);
            NodeNative.node_secp256k1_delinearize_pubkey(out, new Uint8Array(publicKeysHash), new Uint8Array(publicKey));
            return out;
        } else {
            let stackPtr;
            try {
                stackPtr = Module.stackSave();
                const wasmOut = Module.stackAlloc(PublicKey.SIZE);
                const wasmInPublicKey = Module.stackAlloc(publicKey.length);
                const wasmInPublicKeysHash = Module.stackAlloc(publicKeysHash.length);
                new Uint8Array(Module.HEAPU8.buffer, wasmInPublicKey, publicKey.length).set(publicKey);
                new Uint8Array(Module.HEAPU8.buffer, wasmInPublicKeysHash, publicKeysHash.length).set(publicKeysHash);
                Module._secp256k1_delinearize_pubkey(wasmOut, wasmInPublicKeysHash, wasmInPublicKey);
                const delinearizedPublicKey = new Uint8Array(PublicKey.SIZE);
                delinearizedPublicKey.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, PublicKey.SIZE));
                return delinearizedPublicKey;
            } catch (e) {
                Log.w(PublicKey, e);
                throw e;
            } finally {
                if (stackPtr !== undefined) Module.stackRestore(stackPtr);
            }
        }
    }

    /**
     * @param {Array.<Uint8Array>} publicKeys
     * @param {Uint8Array} publicKeysHash
     * @returns {Uint8Array}
     */
    static _publicKeysDelinearizeAndAggregate(publicKeys, publicKeysHash) {
        if (publicKeys.some(publicKey => publicKey.byteLength !== PublicKey.SIZE)
            || publicKeysHash.byteLength !== Hash.getSize(Hash.Algorithm.SHA256)) {
            throw Error('Wrong buffer size.');
        }
        const concatenatedPublicKeys = new Uint8Array(publicKeys.length * PublicKey.SIZE);
        for (let i = 0; i < publicKeys.length; ++i) {
            concatenatedPublicKeys.set(publicKeys[i], i * PublicKey.SIZE);
        }
        if (PlatformUtils.isNodeJs()) {
            const out = new Uint8Array(PublicKey.SIZE);
            NodeNative.node_secp256k1_aggregate_delinearized_publkeys(out, new Uint8Array(publicKeysHash), concatenatedPublicKeys, publicKeys.length, PublicKey.SIZE);
            return out;
        } else {
            let stackPtr;
            try {
                stackPtr = Module.stackSave();
                const wasmOut = Module.stackAlloc(PublicKey.SIZE);
                const wasmInPublicKeys = Module.stackAlloc(concatenatedPublicKeys.length);
                const wasmInPublicKeysHash = Module.stackAlloc(publicKeysHash.length);
                new Uint8Array(Module.HEAPU8.buffer, wasmInPublicKeys, concatenatedPublicKeys.length).set(concatenatedPublicKeys);
                new Uint8Array(Module.HEAPU8.buffer, wasmInPublicKeysHash, publicKeysHash.length).set(publicKeysHash);
                Module._secp256k1_aggregate_delinearized_publkeys(wasmOut, wasmInPublicKeysHash, wasmInPublicKeys, publicKeys.length, PublicKey.SIZE);
                const aggregatePublicKey = new Uint8Array(PublicKey.SIZE);
                aggregatePublicKey.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, PublicKey.SIZE));
                return aggregatePublicKey;
            } catch (e) {
                Log.w(PublicKey, e);
                throw e;
            } finally {
                if (stackPtr !== undefined) Module.stackRestore(stackPtr);
            }
        }
    }
}

PublicKey.COMPRESSED_SIZE = 33;
PublicKey.SIZE = 65;

Class.register(PublicKey);
