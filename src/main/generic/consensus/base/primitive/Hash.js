class Hash extends Serializable {
    /**
     * @param {?Uint8Array} arg
     * @param {Hash.Algorithm} [algorithm]
     * @private
     */
    constructor(arg, algorithm = Hash.Algorithm.BLAKE2B) {
        if (arg === null) {
            arg = new Uint8Array(Hash.getSize(algorithm));
        } else {
            if (!(arg instanceof Uint8Array)) throw new Error('Primitive: Invalid type');
            if (arg.length !== Hash.getSize(algorithm)) throw new Error('Primitive: Invalid length');
        }
        super();
        this._obj = arg;
        /** @type {Hash.Algorithm} */
        this._algorithm = algorithm;
    }

    /**
     * @deprecated
     * @param {Uint8Array} arr
     * @returns {Hash}
     */
    static light(arr) {
        return Hash.blake2b(arr);
    }

    /**
     * @param {Uint8Array} arr
     * @returns {Hash}
     */
    static blake2b(arr) {
        return new Hash(Hash.computeBlake2b(arr), Hash.Algorithm.BLAKE2B);
    }

    /**
     * @param {Uint8Array} arr
     * @deprecated
     * @returns {Promise.<Hash>}
     */
    static hard(arr) {
        return Hash.argon2d(arr);
    }

    /**
     * @param {Uint8Array} arr
     * @returns {Promise.<Hash>}
     */
    static async argon2d(arr) {
        return new Hash(await (await CryptoWorker.getInstanceAsync()).computeArgon2d(arr), Hash.Algorithm.ARGON2D);
    }

    /**
     * @param {Uint8Array} arr
     * @returns {Hash}
     */
    static sha256(arr) {
        return new Hash(Hash.computeSha256(arr), Hash.Algorithm.SHA256);
    }

    /**
     * @param {Uint8Array} arr
     * @returns {Hash}
     */
    static sha512(arr) {
        return new Hash(Hash.computeSha512(arr), Hash.Algorithm.SHA512);
    }

    /**
     * @param {Uint8Array} arr
     * @returns {Hash}
     */
    static ripemd160(arr) {
        return new Hash(Hash.computeRipemd160(arr), Hash.Algorithm.RIPEMD160);
    }

    /**
     * @param {Uint8Array} arr
     * @returns {Hash}
     */
    static doubleHash(arr) {
        return Hash.ripemd160(Hash.computeSha256(arr));
    }

    /**
     * @param {Uint8Array} arr
     * @returns {Hash}
     */
    static keccak256(arr) {
        return new Hash(Hash.computeKeccak256(arr), Hash.Algorithm.KECCAK256);
    }

    /**
     * @param {Uint8Array} arr
     * @param {Hash.Algorithm} algorithm
     * @returns {Hash}
     */
    static compute(arr, algorithm) {
        // !! The algorithms supported by this function are the allowed hash algorithms for HTLCs !!
        switch (algorithm) {
            case Hash.Algorithm.BLAKE2B: return Hash.blake2b(arr);
            case Hash.Algorithm.SHA256: return Hash.sha256(arr);
            // Hash.Algorithm.SHA512 postponed until hard-fork
            // Hash.Algorithm.ARGON2 intentionally omitted
            default: throw new Error('Invalid hash algorithm');
        }
    }

    /**
     * @param {SerialBuffer} buf
     * @param {Hash.Algorithm} [algorithm]
     * @returns {Hash}
     */
    static unserialize(buf, algorithm = Hash.Algorithm.BLAKE2B) {
        return new Hash(buf.read(Hash.getSize(algorithm)), algorithm);
    }

    /**
     * @param {SerialBuffer} [buf]
     * @returns {SerialBuffer}
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

    /** @type {number} */
    get serializedSize() {
        return Hash.SIZE.get(this._algorithm);
    }

    /** @type {Uint8Array} */
    get array() {
        return this._obj;
    }

    /** @type {Hash.Algorithm} */
    get algorithm() {
        return this._algorithm;
    }

    /**
     * @param {Serializable} o
     * @returns {boolean}
     */
    equals(o) {
        return o instanceof Hash && o._algorithm === this._algorithm && super.equals(o);
    }

    /**
     * @param {Hash|Uint8Array|string} hash
     * @param {Hash.Algorithm} algorithm
     * @return {Hash}
     */
    static fromAny(hash, algorithm = Hash.Algorithm.BLAKE2B) {
        if (hash instanceof Hash) return hash;
        try {
            return new Hash(BufferUtils.fromAny(hash, Hash.SIZE.get(algorithm)), algorithm);
        } catch (e) {
            throw new Error('Invalid hash format');
        }
    }

    /**
     * @returns {string}
     */
    toPlain() {
        return this.toHex();
    }

    /**
     * @param {string} base64
     * @returns {Hash}
     */
    static fromBase64(base64) {
        return new Hash(BufferUtils.fromBase64(base64));
    }

    /**
     * @param {string} hex
     * @returns {Hash}
     */
    static fromHex(hex) {
        return new Hash(BufferUtils.fromHex(hex));
    }

    /**
     * @param {string} str
     * @returns {Hash}
     */
    static fromPlain(str) {
        return Hash.fromString(str);
    }

    /**
     * @param {string} str
     * @returns {Hash}
     */
    static fromString(str) {
        try {
            return Hash.fromHex(str);
        } catch (e) {
            // Ignore
        }

        try {
            return Hash.fromBase64(str);
        } catch (e) {
            // Ignore
        }

        throw new Error('Invalid hash format');
    }

    /**
     * @param {Hash} o
     * @returns {boolean}
     */
    static isHash(o) {
        return o instanceof Hash;
    }

    /**
     * @param {Hash.Algorithm} algorithm
     * @returns {number}
     */
    static getSize(algorithm) {
        const size = Hash.SIZE.get(algorithm);
        if (typeof size !== 'number') throw new Error('Invalid hash algorithm');
        return size;
    }

    /**
     * @param {Uint8Array} input
     * @returns {Uint8Array}
     */
    static computeBlake2b(input) {
        if (PlatformUtils.isNodeJs()) {
            const out = new Uint8Array(Hash.getSize(Hash.Algorithm.BLAKE2B));
            NodeNative.node_blake2(out, new Uint8Array(input));
            return out;
        } else {
            let stackPtr;
            try {
                stackPtr = Module.stackSave();
                const hashSize = Hash.getSize(Hash.Algorithm.BLAKE2B);
                const wasmOut = Module.stackAlloc(hashSize);
                const wasmIn = Module.stackAlloc(input.length);
                new Uint8Array(Module.HEAPU8.buffer, wasmIn, input.length).set(input);
                const res = Module._krypton_blake2(wasmOut, wasmIn, input.length);
                if (res !== 0) {
                    throw res;
                }
                const hash = new Uint8Array(hashSize);
                hash.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, hashSize));
                return hash;
            } catch (e) {
                Log.w(Hash, e);
                throw e;
            } finally {
                if (stackPtr !== undefined) Module.stackRestore(stackPtr);
            }
        }
    }

    /**
     * @param {Uint8Array} input
     * @returns {Uint8Array}
     */
    static computeSha256(input) {
        if (PlatformUtils.isNodeJs()) {
            const out = new Uint8Array(Hash.getSize(Hash.Algorithm.SHA256));
            NodeNative.node_sha256(out, new Uint8Array(input));
            return out;
        } else {
            let stackPtr;
            try {
                stackPtr = Module.stackSave();
                const hashSize = Hash.getSize(Hash.Algorithm.SHA256);
                const wasmOut = Module.stackAlloc(hashSize);
                const wasmIn = Module.stackAlloc(input.length);
                new Uint8Array(Module.HEAPU8.buffer, wasmIn, input.length).set(input);
                Module._krypton_sha256(wasmOut, wasmIn, input.length);
                const hash = new Uint8Array(hashSize);
                hash.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, hashSize));
                return hash;
            } catch (e) {
                Log.w(Hash, e);
                throw e;
            } finally {
                if (stackPtr !== undefined) Module.stackRestore(stackPtr);
            }
        }
    }

    /**
     * @param {Uint8Array} input
     * @returns {Uint8Array}
     */
    static computeSha512(input) {
        if (PlatformUtils.isNodeJs()) {
            const out = new Uint8Array(Hash.getSize(Hash.Algorithm.SHA512));
            NodeNative.node_sha512(out, new Uint8Array(input));
            return out;
        } else {
            let stackPtr;
            try {
                stackPtr = Module.stackSave();
                const hashSize = Hash.getSize(Hash.Algorithm.SHA512);
                const wasmOut = Module.stackAlloc(hashSize);
                const wasmIn = Module.stackAlloc(input.length);
                new Uint8Array(Module.HEAPU8.buffer, wasmIn, input.length).set(input);
                Module._krypton_sha512(wasmOut, wasmIn, input.length);
                const hash = new Uint8Array(hashSize);
                hash.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, hashSize));
                return hash;
            } catch (e) {
                Log.w(Hash, e);
                throw e;
            } finally {
                if (stackPtr !== undefined) Module.stackRestore(stackPtr);
            }
        }
    }

    /**
     * @param {Uint8Array} input
     * @returns {Uint8Array}
     */
    static computeRipemd160(input) {
        if (PlatformUtils.isNodeJs()) {
            const out = new Uint8Array(Hash.getSize(Hash.Algorithm.RIPEMD160));
            NodeNative.node_ripemd160(out, new Uint8Array(input));
            return out;
        } else {
            let stackPtr;
            try {
                stackPtr = Module.stackSave();
                const hashSize = Hash.getSize(Hash.Algorithm.RIPEMD160);
                const wasmOut = Module.stackAlloc(hashSize);
                const wasmIn = Module.stackAlloc(input.length);
                new Uint8Array(Module.HEAPU8.buffer, wasmIn, input.length).set(input);
                Module._ripemd160(wasmIn, input.length, wasmOut);
                const hash = new Uint8Array(hashSize);
                hash.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, hashSize));
                return hash;
            } catch (e) {
                Log.w(Hash, e);
                throw e;
            } finally {
                if (stackPtr !== undefined) Module.stackRestore(stackPtr);
            }
        }
    }

    /**
     * @param {Uint8Array} input
     * @returns {Uint8Array}
     */
    static computeKeccak256(input) {
        if (PlatformUtils.isNodeJs()) {
            const out = new Uint8Array(Hash.getSize(Hash.Algorithm.KECCAK256));
            NodeNative.node_keccak256(out, new Uint8Array(input));
            return out;
        } else {
            let stackPtr;
            try {
                stackPtr = Module.stackSave();
                const hashSize = Hash.getSize(Hash.Algorithm.KECCAK256);
                const wasmOut = Module.stackAlloc(hashSize);
                const wasmIn = Module.stackAlloc(input.length);
                new Uint8Array(Module.HEAPU8.buffer, wasmIn, input.length).set(input);
                Module._keccak256(wasmIn, input.length, wasmOut);
                const hash = new Uint8Array(hashSize);
                hash.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, hashSize));
                return hash;
            } catch (e) {
                Log.w(Hash, e);
                throw e;
            } finally {
                if (stackPtr !== undefined) Module.stackRestore(stackPtr);
            }
        }
    }
}

/**
 * @enum {number}
 */
Hash.Algorithm = {
    BLAKE2B: 1,
    ARGON2D: 2,
    SHA256: 3,
    SHA512: 4,
    RIPEMD160: 5,
    KECCAK256: 6
};
/**
 * @param {Hash.Algorithm} hashAlgorithm
 * @return {string}
 */
Hash.Algorithm.toString = function(hashAlgorithm) {
    switch (hashAlgorithm) {
        case Hash.Algorithm.BLAKE2B: return 'blake2b';
        case Hash.Algorithm.ARGON2D: return 'argon2d';
        case Hash.Algorithm.SHA256: return 'sha256';
        case Hash.Algorithm.SHA512: return 'sha512';
        case Hash.Algorithm.RIPEMD160: return 'ripemd160';
        case Hash.Algorithm.KECCAK256: return 'keccak256';
    }
    throw new Error('Invalid hash algorithm');
};

/**
 * @param {Hash.Algorithm|string} algorithm
 * @returns {Hash.Algorithm}
 */
Hash.Algorithm.fromAny = function (algorithm) {
    if (typeof algorithm === 'number') return algorithm;
    switch (algorithm) {
        case 'blake2b': return Hash.Algorithm.BLAKE2B;
        case 'argon2d': return Hash.Algorithm.ARGON2D;
        case 'sha256': return Hash.Algorithm.SHA256;
        case 'sha512': return Hash.Algorithm.SHA512;
        case 'ripemd160': return Hash.Algorithm.RIPEMD160;
        case 'keccak256': return Hash.Algorithm.KECCAK256;
    }
    throw new Error('Invalid hash algorithm');
};

/**
 * @type {Map<Hash.Algorithm, number>}
 */
Hash.SIZE = new Map();
Hash.SIZE.set(Hash.Algorithm.BLAKE2B, 32);
Hash.SIZE.set(Hash.Algorithm.ARGON2D, 32);
Hash.SIZE.set(Hash.Algorithm.SHA256, 32);
Hash.SIZE.set(Hash.Algorithm.SHA512, 64);
Hash.SIZE.set(Hash.Algorithm.RIPEMD160, 20);
Hash.SIZE.set(Hash.Algorithm.KECCAK256, 32);

Hash.NULL = new Hash(new Uint8Array(32));
Class.register(Hash);
