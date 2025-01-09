class Policy {
    /**
     * Convert Krypton decimal to Number of Satoshis.
     * @param {BigNumber|number|string} coins Krypton count in decimal
     * @return {BigNumber} Number of Satoshis
     */
    static coinsToSatoshis(coins) {
        return new BigNumber(coins).times(Policy.SATOSHIS_PER_COIN).integerValue();
    }

    /**
     * Convert Number of Satoshis to Krypton decimal.
     * @param {BigNumber|number|string} satoshis Number of Satoshis.
     * @return {BigNumber} Krypton count in decimal.
     */
    static satoshisToCoins(satoshis) {
        return new BigNumber(satoshis).div(Policy.SATOSHIS_PER_COIN);
    }

    /**
     * Miner reward per block.
     * @param {number} blockHeight
     * @return {BigNumber}
     */
    static blockRewardAt(blockHeight) {
        if (blockHeight <= 0) return new BigNumber(0);
        const halving = Math.min(Math.floor((blockHeight - 1) / Policy.HALVING_INTERVAL), Policy.HALVING_TARGET_MAX - 1);
        return new BigNumber(Policy.INITIAL_BLOCK_REWARD).idiv(Math.pow(2, halving));
    }

    /**
     * targeted block time of block.
     * @param {number} blockHeight
     * @return {number}
     */
    static blockTime(blockHeight) {
        if (blockHeight <= Policy.BLOCK_TIME_MILESTONE) return Policy.INITIAL_BLOCK_TIME;
        if (blockHeight > Policy.HALVING_INTERVAL * Policy.HALVING_TARGET_MAX) return Policy.INITIAL_BLOCK_TIME;

        return Policy.BLOCK_TIME_MULTIPLE * (Policy.HALVING_TARGET_MAX - Math.floor((blockHeight - 1) / Policy.HALVING_INTERVAL));
    }

    /**
     * targeted time for block height.
     * @param {number} blockHeight
     * @return {number}
     */
    static targetedTime(blockHeight) {
        if (blockHeight <= Policy.BLOCK_TIME_MILESTONE) return (blockHeight - 1) * Policy.INITIAL_BLOCK_TIME;

        const initial = Policy.BLOCK_TIME_MILESTONE * Policy.INITIAL_BLOCK_TIME;
        const secondBlockTime = Policy.BLOCK_TIME_MULTIPLE * Policy.HALVING_TARGET_MAX;
        if (blockHeight <= Policy.HALVING_INTERVAL) {
            return initial + (blockHeight - Policy.BLOCK_TIME_MILESTONE - 1) * secondBlockTime;
        }

        // first range
        let target = initial + (Policy.HALVING_INTERVAL - Policy.BLOCK_TIME_MILESTONE) * secondBlockTime;
        // from second range
        let height = blockHeight - Policy.HALVING_INTERVAL;
        let count = 1;
        // calculate for each range
        while (height > Policy.HALVING_INTERVAL && count < Policy.HALVING_TARGET_MAX) {
            target += Policy.HALVING_INTERVAL * Policy.BLOCK_TIME_MULTIPLE * (Policy.HALVING_TARGET_MAX - count);
            height -= Policy.HALVING_INTERVAL;
            count += 1;
        }
        // last
        if (count >= Policy.HALVING_TARGET_MAX) {
            target += (height - 1) * Policy.INITIAL_BLOCK_TIME;
        } else {
            target += (height - 1) * Policy.BLOCK_TIME_MULTIPLE * (Policy.HALVING_TARGET_MAX - count);
        }

        return target;
    }

    /**
     * targeted time of block range.
     * @param {number} begin
     * @param {number} end
     * @return {number}
     */
    static targetedTimeBlockRange(begin, end) {
        const beginBlock = begin > 1 ? begin : 1;
        const endBlock = end > 1 ? end : 1;
        if (beginBlock >= endBlock) return 0;

        const blockMilestoneMax = Policy.HALVING_INTERVAL * Policy.HALVING_TARGET_MAX;
        let range = endBlock - beginBlock;
        if (endBlock <= Policy.BLOCK_TIME_MILESTONE || beginBlock > blockMilestoneMax) {
            return range * Policy.INITIAL_BLOCK_TIME;
        }
        
        const secondBlockTime = Policy.BLOCK_TIME_MULTIPLE * Policy.HALVING_TARGET_MAX;
        if (endBlock <= Policy.HALVING_INTERVAL) {
            if (beginBlock <= Policy.BLOCK_TIME_MILESTONE) {
                return (Policy.BLOCK_TIME_MILESTONE - beginBlock + 1) * Policy.INITIAL_BLOCK_TIME + (endBlock - Policy.BLOCK_TIME_MILESTONE - 1) * secondBlockTime;
            }
            return range * secondBlockTime;
        }

        const beginRangeIndex = Math.floor((beginBlock - 1) / Policy.HALVING_INTERVAL);
        let endRangeIndex = Math.floor((endBlock - 1) / Policy.HALVING_INTERVAL);
        // in a range
        if (beginRangeIndex === endRangeIndex) {
            return range * Policy.BLOCK_TIME_MULTIPLE * (Policy.HALVING_TARGET_MAX - beginRangeIndex);
        }

        let beginBlocksTime;
        let middleBlocksTime = 0;
        let endBlocksTime;
        if (beginBlock <= Policy.BLOCK_TIME_MILESTONE) {
            beginBlocksTime = (Policy.BLOCK_TIME_MILESTONE - beginBlock + 1) * Policy.INITIAL_BLOCK_TIME + (Policy.HALVING_INTERVAL - Policy.BLOCK_TIME_MILESTONE) * secondBlockTime;
        } else {
            const beginBlockMilestone = (beginRangeIndex + 1) * Policy.HALVING_INTERVAL;
            beginBlocksTime = (beginBlockMilestone - beginBlock + 1) * Policy.BLOCK_TIME_MULTIPLE * (Policy.HALVING_TARGET_MAX - beginRangeIndex);
        }
        if (endBlock > blockMilestoneMax) {
            endRangeIndex = Policy.HALVING_TARGET_MAX;
            endBlocksTime = (endBlock - blockMilestoneMax - 1) * Policy.INITIAL_BLOCK_TIME;
        } else {
            const endBlockMilestone = endRangeIndex * Policy.HALVING_INTERVAL;
            endBlocksTime = (endBlock - endBlockMilestone - 1) * Policy.BLOCK_TIME_MULTIPLE * (Policy.HALVING_TARGET_MAX - endRangeIndex);
        }
        for (let i = beginRangeIndex + 1; i < endRangeIndex; i++) {
            middleBlocksTime += Policy.HALVING_INTERVAL * Policy.BLOCK_TIME_MULTIPLE * (Policy.HALVING_TARGET_MAX - i);
        }
        return beginBlocksTime + middleBlocksTime + endBlocksTime;
    }

    /**
     * tx fee at block.
     * @param {number} blockHeight
     * @return {BigNumber}
     */
    static txFee(blockHeight) {
        if (blockHeight <= 1) return new BigNumber(0);
        const changing = Math.floor((blockHeight - 1) / Policy.TX_FEE_CHANGING_INTERVAL);
        if (changing < Policy.TX_FEE_CHANGING_TOTAL_NUMBER) {
            return new BigNumber(Policy.INITIAL_TX_FEE).div(Math.pow(10, changing));
        }
        return new BigNumber(1);
    }

    /**
     * block size.
     * @param {number} blockHeight
     * @return {number}
     */
    static blockSize(blockHeight) {
        if (blockHeight < Policy.FORKING_FOR_BLOCK_DIFFICULTY_BLOCK_SIZE) return Policy.INITIAL_BLOCK_SIZE;
        return Policy.BASE_BLOCK_SIZE + Policy.BLOCK_SIZE_FACTOR * Math.floor(blockHeight / Policy.BLOCK_SIZE_CHANGING_INTERVAL);
    }

    /**
     * difficulty block window
     * @param {number} blockHeight
     * @return {number}
     */
    static difficultyBlockWindow(blockHeight) {
        if (blockHeight >= Policy.SECOND_FORKING_FOR_BLOCK_DIFFICULTY
            || blockHeight < Policy.FORKING_FOR_BLOCK_DIFFICULTY_BLOCK_SIZE) return Policy.DIFFICULTY_BLOCK_WINDOW;
        
        const time = Policy.blockTime(blockHeight);
        return Math.floor(360 / time);
    }
}

/**
 * Targeted block time in seconds.
 * @type {number}
 * @constant
 */
Policy.INITIAL_BLOCK_TIME = 3;

/**
 * Multiple block time argument.
 * @type {number}
 * @constant
 */
Policy.BLOCK_TIME_MULTIPLE = 3;

/**
 * Milestone for the first time that block time changed.
 * @type {number}
 * @constant
 */
Policy.BLOCK_TIME_MILESTONE = 1100000;

/**
 * Initial block size in bytes.
 * @type {number}
 * @constant
 */
Policy.INITIAL_BLOCK_SIZE = 1e5; // 100 kb

/**
 * base block size in bytes.
 * @type {number}
 * @constant
 */
Policy.BASE_BLOCK_SIZE = 2100000; // 2.1 Mb

/**
 * block size factor in bytes.
 * @type {number}
 * @constant
 */
Policy.BLOCK_SIZE_FACTOR = 2100; // 2.1 kb

/**
 * Block size will be change every 2.1M blocks.
 * @type {number}
 * @constant
 */
Policy.BLOCK_SIZE_CHANGING_INTERVAL = 2100000;

/**
 * The highest (easiest) block PoW target.
 * @type {BigNumber}
 * @constant
 */
Policy.BLOCK_TARGET_MAX = new BigNumber(2).pow(240);

/**
 * Number of blocks we take into account to calculate next difficulty.
 * @type {number}
 * @constant
 */
Policy.DIFFICULTY_BLOCK_WINDOW = 120;

/**
 * Block number that we apply some new settings about block difficulty, block size.
 * @type {number}
 * @constant
 */
Policy.FORKING_FOR_BLOCK_DIFFICULTY_BLOCK_SIZE = 1124816;

/**
 * Limits the rate at which the difficulty is adjusted min/max.
 * @type {number}
 * @constant
 */
Policy.DIFFICULTY_MAX_ADJUSTMENT_FACTOR = 2;

/**
 * Limits the rate at which the difficulty is adjusted max.
 * @type {number}
 * @constant
 */
Policy.NEW_DIFFICULTY_MAX_ADJUSTMENT_FACTOR = 1.3;

/**
 * Limits the rate at which the difficulty is adjusted min.
 * @type {number}
 * @constant
 */
Policy.NEW_DIFFICULTY_MIN_ADJUSTMENT_FACTOR = 0.7;

/**
 * Block number that we apply some new settings about block difficulty (the second).
 * @type {number}
 * @constant
 */
Policy.SECOND_FORKING_FOR_BLOCK_DIFFICULTY = 1132333;

/**
 * Limits the rate at which the difficulty is adjusted max (the second).
 * @type {number}
 * @constant
 */
Policy.SECOND_DIFFICULTY_MAX_ADJUSTMENT_FACTOR = 1.5;

/**
 * Limits the rate at which the difficulty is adjusted min (the second).
 * @type {number}
 * @constant
 */
Policy.SECOND_DIFFICULTY_MIN_ADJUSTMENT_FACTOR = 0.5;

/**
 * Number of blocks a transaction is valid.
 * @type {number}
 * @constant
 */
Policy.TRANSACTION_VALIDITY_WINDOW = 120;


/* Supply & Emission Parameters */

/**
 * Number of Satoshis per Krypton.
 * @type {number}
 * @constant
 */
Policy.SATOSHIS_PER_COIN = 1e11;

/**
 * Initial supply before genesis block in satoshis.
 * @type {number}
 * @constant
 */

Policy.INITIAL_SUPPLY = 0;

/**
 * block reward in satoshis
 * @type {number}
 * @constant
 */
Policy.INITIAL_BLOCK_REWARD = 5e11;

/**
 * in this time the block reward should not be halved anymore
 * @type {number}
 * @constant
 */
Policy.HALVING_TARGET_MAX = 21;

/**
 * halving the block reward each 2.100.000 blocks
 * @type {number}
 * @constant
 */
Policy.HALVING_INTERVAL = 2100000;

/* Security parameters */

/**
 * NIPoPoW Security parameter M
 * FIXME naming
 * @type {number}
 * @constant
 */
Policy.M = 240;

/**
 * NIPoPoW Security parameter K
 * FIXME naming
 * @type {number}
 * @constant
 */
Policy.K = 120;

/**
 * NIPoPoW Security parameter DELTA
 * FIXME naming
 * @type {number}
 * @constant
 */
Policy.DELTA = 0.15;

/**
 * Number of blocks the light client downloads to verify the AccountsTree construction.
 * FIXME naming
 * @type {number}
 * @constant
 */
Policy.NUM_BLOCKS_VERIFICATION = 250;


/* Snapshot Parameters */

/**
 * Maximum number of snapshots.
 * @type {number}
 * @constant
 */
Policy.NUM_SNAPSHOTS_MAX = 20;

/* Tx */

/**
 * Initial tx fee in Satoshi
 * @type {number}
 * @constant
 */
Policy.INITIAL_TX_FEE = 1e6; // 1M

/**
 * changine tx fee each 6300000 blocks
 * @type {number}
 * @constant
 */
Policy.TX_FEE_CHANGING_INTERVAL = 6300000;

/**
 * Total number of changing tx fee
 * @type {number}
 * @constant
 */
Policy.TX_FEE_CHANGING_TOTAL_NUMBER = 6;

Class.register(Policy);
