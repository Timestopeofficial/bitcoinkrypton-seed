class NumberUtils {
    /**
     * @param {unknown} val
     * @return {boolean}
     */
    static isUint8(val) {
        return Number.isInteger(val)
            && val >= 0 && val <= NumberUtils.UINT8_MAX;
    }

    /**
     * @param {unknown} val
     * @return {boolean}
     */
    static isUint16(val) {
        return Number.isInteger(val)
            && val >= 0 && val <= NumberUtils.UINT16_MAX;
    }

    /**
     * @param {unknown} val
     * @return {boolean}
     */
    static isUint32(val) {
        return Number.isInteger(val)
            && val >= 0 && val <= NumberUtils.UINT32_MAX;
    }

    /**
     * @param {unknown} val
     * @return {boolean}
     */
    static isUint64(val) {
        return Number.isInteger(val)
            && val >= 0 && val <= NumberUtils.UINT64_MAX;
    }

    /**
     * @param {BigNumber} val
     * @return {boolean}
     */
    static isUint128(val) {
        return val.isInteger() && val.gte(0) && val.lte(NumberUtils.UINT128_MAX);
    }

    /**
     * @return {number}
     */
    static randomUint32() {
        return Math.floor(Math.random() * (NumberUtils.UINT32_MAX + 1));
    }

    /**
     * @return {number}
     */
    static randomUint64() {
        return Math.floor(Math.random() * (NumberUtils.UINT64_MAX + 1));
    }

    /**
     * @param {string} bin
     * @return {number}
     */
    static fromBinary(bin) {
        return parseInt(bin, 2);
    }
}

NumberUtils.UINT8_MAX = 255;
NumberUtils.UINT16_MAX = 65535;
NumberUtils.UINT32_MAX = 4294967295;
NumberUtils.UINT64_MAX = Number.MAX_SAFE_INTEGER;
NumberUtils.UINT128_MAX = new BigNumber('ffffffffffffffffffffffffffffffff', 16);
//Object.freeze(NumberUtils);
Class.register(NumberUtils);
