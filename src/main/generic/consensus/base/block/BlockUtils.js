class BlockUtils {
    /**
     * @param {number} compact
     * @returns {BigNumber}
     */
    static compactToTarget(compact) {
        return new BigNumber(compact & 0xffffff).times(new BigNumber(2).pow(8 * Math.max((compact >> 24) - 3, 0)));
    }

    /**
     * @param {BigNumber} target
     * @returns {number}
     */
    static targetToCompact(target) {
        if (!target.isFinite() || target.isNaN()) throw new Error('Invalid Target');

        // Divide to get first byte
        let size = Math.max(Math.ceil(Math.log2(target.toNumber()) / 8), 1);
        const firstByte = target / Math.pow(2, (size - 1) * 8);

        // If the first (most significant) byte is greater than 127 (0x7f),
        // prepend a zero byte.
        if (firstByte >= 0x80 && size >= 3) {
            size++;
        }

        // The first byte of the 'compact' format is the number of bytes,
        // including the prepended zero if it's present.
        // The following three bytes are the first three bytes of the above
        // representation. If less than three bytes are present, then one or
        // more of the last bytes of the compact representation will be zero.
        return (size << 24) + ((target / Math.pow(2, Math.max(size - 3, 0) * 8)) & 0xffffff);
    }

    /**
     * @param {BigNumber} target
     * @returns {number}
     */
    static getTargetHeight(target) {
        // Precision loss should be ok here.
        return Math.ceil(Math.log2(target.toNumber()));
    }

    /**
     * @param {BigNumber} target
     * @returns {number}
     */
    static getTargetDepth(target) {
        return BlockUtils.getTargetHeight(Policy.BLOCK_TARGET_MAX) - BlockUtils.getTargetHeight(target);
    }

    /**
     * @param {number} compact
     * @returns {BigNumber}
     */
    static compactToDifficulty(compact) {
        return Policy.BLOCK_TARGET_MAX.div(BlockUtils.compactToTarget(compact));
    }

    /**
     * @param {BigNumber} difficulty
     * @returns {number}
     */
    static difficultyToCompact(difficulty) {
        return BlockUtils.targetToCompact(BlockUtils.difficultyToTarget(difficulty));
    }

    /**
     * @param {BigNumber} difficulty
     * @returns {BigNumber}
     */
    static difficultyToTarget(difficulty) {
        return Policy.BLOCK_TARGET_MAX.div(difficulty);
    }

    /**
     * @param {BigNumber} target
     * @returns {BigNumber}
     */
    static targetToDifficulty(target) {
        return Policy.BLOCK_TARGET_MAX.div(target);
    }

    /**
     * @param {Hash} hash
     * @returns {BigNumber}
     */
    static hashToTarget(hash) {
        return new BigNumber(hash.toHex(), 16);
    }

    /**
     * @param {Hash} hash
     * @returns {BigNumber}
     */
    static realDifficulty(hash) {
        return BlockUtils.targetToDifficulty(BlockUtils.hashToTarget(hash));
    }

    /**
     * @param {Hash} hash
     * @returns {number}
     */
    static getHashDepth(hash) {
        return BlockUtils.getTargetDepth(BlockUtils.hashToTarget(hash));
    }

    /**
     * @param {Hash} hash
     * @param {BigNumber} target
     * @returns {boolean}
     */
    static isProofOfWork(hash, target) {
        return new BigNumber(hash.toHex(), 16).lte(target);
    }

    /**
     * @param {number} compact
     * @returns {boolean}
     */

    static isValidCompact(compact) {
        return BlockUtils.isValidTarget(BlockUtils.compactToTarget(compact));
    }

    /**
     * @param {?BigNumber} target
     * @returns {boolean}
     */
    static isValidTarget(target) {
        return target !== null && target.gte(1) && target.lte(Policy.BLOCK_TARGET_MAX);
    }

    /**
     * @param {BlockHeader} headBlock
     * @param {BlockHeader} tailBlock
     * @param {BigNumber} deltaTotalDifficulty
     * @returns {BigNumber}
     */
    static getNextTarget(headBlock, tailBlock, deltaTotalDifficulty) {
        const blockWindow = Policy.difficultyBlockWindow(headBlock.height);
        Assert.that(
            (headBlock.height - tailBlock.height === blockWindow)
                || (headBlock.height <= blockWindow && tailBlock.height === 1),
            `Tail and head block must be ${blockWindow} blocks apart`);

        let actualTime = headBlock.timestamp - tailBlock.timestamp;

        // Simulate that the Policy.BLOCK_TIME was achieved for the blocks before the genesis block, i.e. we simulate
        // a sliding window that starts before the genesis block. Assume difficulty = 1 for these blocks.
        if (headBlock.height <= blockWindow) {
            actualTime += (blockWindow - headBlock.height + 1) * Policy.INITIAL_BLOCK_TIME;
            deltaTotalDifficulty = deltaTotalDifficulty.plus(blockWindow - headBlock.height + 1);
        }

        // Compute the target adjustment factor.
        const expectedTime = blockWindow * Policy.blockTime(headBlock.height);
        let adjustment = actualTime / expectedTime;

        if (headBlock.height >= Policy.SECOND_FORKING_FOR_BLOCK_DIFFICULTY) {
            // for block equal or greater than 1132333 (mainnet)
            adjustment = Math.max(adjustment, 1 / Policy.SECOND_DIFFICULTY_MAX_ADJUSTMENT_FACTOR);
            adjustment = Math.min(adjustment, 1 / Policy.SECOND_DIFFICULTY_MIN_ADJUSTMENT_FACTOR);
        } else if (headBlock.height >= Policy.FORKING_FOR_BLOCK_DIFFICULTY_BLOCK_SIZE) {
            // for block equal or greater than 1124816 (mainnet)
            adjustment = Math.max(adjustment, 1 / Policy.NEW_DIFFICULTY_MAX_ADJUSTMENT_FACTOR);
            adjustment = Math.min(adjustment, 1 / Policy.NEW_DIFFICULTY_MIN_ADJUSTMENT_FACTOR);
        } else {
            // forking: from block 2 to block less than 1124816 mainnet
            // Clamp the adjustment factor to [1 / MAX_ADJUSTMENT_FACTOR, MAX_ADJUSTMENT_FACTOR].
            adjustment = Math.max(adjustment, 1 / Policy.DIFFICULTY_MAX_ADJUSTMENT_FACTOR);
            adjustment = Math.min(adjustment, Policy.DIFFICULTY_MAX_ADJUSTMENT_FACTOR);
        }

        // Compute the next target.
        const averageDifficulty = deltaTotalDifficulty.div(blockWindow);
        const averageTarget = BlockUtils.difficultyToTarget(averageDifficulty);
        let nextTarget = averageTarget.times(adjustment);

        // Make sure the target is below or equal the maximum allowed target (difficulty 1).
        // Also enforce a minimum target of 1.
        nextTarget = BigNumber.min(nextTarget, Policy.BLOCK_TARGET_MAX);
        nextTarget = BigNumber.max(nextTarget, 1);

        // XXX Reduce target precision to nBits precision.
        const nBits = BlockUtils.targetToCompact(nextTarget);
        return BlockUtils.compactToTarget(nBits);
    }
}
Class.register(BlockUtils);
