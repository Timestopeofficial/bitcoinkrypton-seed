class PartialSignature extends Serializable {
    /**
     * @param {Uint8Array} arg
     * @private
     */
    constructor(arg) {
        super();
        if (!(arg instanceof Uint8Array)) throw new Error('Primitive: Invalid type');
        if (arg.length !== PartialSignature.SIZE) throw new Error('Primitive: Invalid length');
        this._obj = arg;
    }

    /**
     * @param {PrivateKey} privateKey
     * @param {PublicKey} publicKey
     * @param {Array.<PublicKey>} publicKeys
     * @param {RandomSecret} secret
     * @param {Commitment} aggregateCommitment
     * @param {Uint8Array} data
     * @return {PartialSignature}
     */
    static create(privateKey, publicKey, publicKeys, secret, aggregateCommitment, data) {
        const raw = PartialSignature._delinearizedPartialSignatureCreate(publicKeys.map(o => o.compress()), privateKey._obj,
            publicKey.compress(), secret._obj, aggregateCommitment.compress(), data);
        return new PartialSignature(raw);
    }

    /**
     * @param {SerialBuffer} buf
     * @return {PartialSignature}
     */
    static unserialize(buf) {
        return new PartialSignature(buf.read(PartialSignature.SIZE));
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
        return PartialSignature.SIZE;
    }

    /**
     * @param {Serializable} o
     * @return {boolean}
     */
    equals(o) {
        return o instanceof PartialSignature && super.equals(o);
    }

    /**
     * @param {Array.<Uint8Array>} publicKeys
     * @param {Uint8Array} privateKey
     * @param {Uint8Array} publicKey
     * @param {Uint8Array} secret
     * @param {Uint8Array} aggregateCommitment
     * @param {Uint8Array} message
     * @returns {Uint8Array}
     */
    static _delinearizedPartialSignatureCreate(publicKeys, privateKey, publicKey, secret, aggregateCommitment, message) {
        if (publicKeys.some(publicKey => publicKey.byteLength !== PublicKey.COMPRESSED_SIZE)
            || privateKey.byteLength !== PrivateKey.SIZE
            || publicKey.byteLength !== PublicKey.COMPRESSED_SIZE
            || secret.byteLength !== RandomSecret.SIZE
            || aggregateCommitment.byteLength !== Commitment.COMPRESSED_SIZE) {
            throw Error('Wrong buffer size.');
        }
        const randomize = new Uint8Array(32);
        CryptoWorker.lib.getRandomValues(randomize);
        const concatenatedPublicKeys = new Uint8Array(publicKeys.length * PublicKey.COMPRESSED_SIZE);
        for (let i = 0; i < publicKeys.length; ++i) {
            concatenatedPublicKeys.set(publicKeys[i], i * PublicKey.COMPRESSED_SIZE);
        }
        if (PlatformUtils.isNodeJs()) {
            NodeNative.node_secp256k1_ctx_init(randomize);
            const out = new Uint8Array(PartialSignature.SIZE);
            NodeNative.node_secp256k1_partial_sign(out, new Uint8Array(message), new Uint8Array(aggregateCommitment), new Uint8Array(secret), new Uint8Array(concatenatedPublicKeys), publicKeys.length, new Uint8Array(publicKey), new Uint8Array(privateKey));
            NodeNative.node_secp256k1_ctx_release();
            return out;
        } else {
            let stackPtr;
            try {
                stackPtr = Module.stackSave();
                const rdm = Module.stackAlloc(32);
                new Uint8Array(Module.HEAP8.buffer, rdm, 32).set(randomize);
                Module._secp256k1_ctx_init(rdm);

                const wasmOut = Module.stackAlloc(PartialSignature.SIZE);
                const wasmInPublicKeys = Module.stackAlloc(concatenatedPublicKeys.length);
                const wasmInPrivateKey = Module.stackAlloc(privateKey.length);
                const wasmInPublicKey = Module.stackAlloc(publicKey.length);
                const wasmInSecret = Module.stackAlloc(secret.length);
                const wasmInCommitment = Module.stackAlloc(aggregateCommitment.length);
                const wasmInMessage = Module.stackAlloc(message.length);
                new Uint8Array(Module.HEAPU8.buffer, wasmInPublicKeys, concatenatedPublicKeys.length).set(concatenatedPublicKeys);
                new Uint8Array(Module.HEAPU8.buffer, wasmInPrivateKey, privateKey.length).set(privateKey);
                new Uint8Array(Module.HEAPU8.buffer, wasmInPublicKey, publicKey.length).set(publicKey);
                new Uint8Array(Module.HEAPU8.buffer, wasmInSecret, secret.length).set(secret);
                new Uint8Array(Module.HEAPU8.buffer, wasmInCommitment, aggregateCommitment.length).set(aggregateCommitment);
                new Uint8Array(Module.HEAPU8.buffer, wasmInMessage, message.length).set(message);
                Module._secp256k1_partial_sign(wasmOut, wasmInMessage, message.length, wasmInCommitment, wasmInSecret, wasmInPublicKeys, publicKeys.length, wasmInPublicKey, wasmInPrivateKey);
                const partialSignature = new Uint8Array(PartialSignature.SIZE);
                partialSignature.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, PartialSignature.SIZE));
                return partialSignature;
            } catch (e) {
                Log.w(CryptoWorkerImpl, e);
                throw e;
            } finally {
                Module._secp256k1_ctx_release();
                if (stackPtr !== undefined) Module.stackRestore(stackPtr);
            }
        }
    }
}

PartialSignature.HALF_SIZE = 32;
PartialSignature.SIZE = 64;
Class.register(PartialSignature);
