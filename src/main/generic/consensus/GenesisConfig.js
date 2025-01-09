class GenesisConfig {
    static main() {
        GenesisConfig.init(GenesisConfig.CONFIGS['main']);
    }

    static test() {
        GenesisConfig.init(GenesisConfig.CONFIGS['test']);
    }

    static dev() {
        GenesisConfig.init(GenesisConfig.CONFIGS['dev']);
    }

    /**
     * @param {{NETWORK_ID:number,NETWORK_NAME:string,GENESIS_BLOCK:Block,GENESIS_ACCOUNTS:string,SEED_PEERS:Array.<PeerAddress>}} config
     */
    static init(config) {
        if (GenesisConfig._config) throw new Error('GenesisConfig already initialized');
        if (!config.NETWORK_ID) throw new Error('Config is missing network id');
        if (!config.NETWORK_NAME) throw new Error('Config is missing network name');
        if (!config.GENESIS_BLOCK) throw new Error('Config is missing genesis block');
        if (!config.GENESIS_ACCOUNTS) throw new Error('Config is missing genesis accounts');
        if (!config.SEED_PEERS) throw new Error('Config is missing seed peers');

        GenesisConfig._config = config;
    }

    /**
     * @type {number}
     */
    static get NETWORK_ID() {
        if (!GenesisConfig._config) throw new Error('GenesisConfig not initialized');
        return GenesisConfig._config.NETWORK_ID;
    }

    /**
     * @type {string}
     */
    static get NETWORK_NAME() {
        if (!GenesisConfig._config) throw new Error('GenesisConfig not initialized');
        return GenesisConfig._config.NETWORK_NAME;
    }

    /**
     * @type {Block}
     */
    static get GENESIS_BLOCK() {
        if (!GenesisConfig._config) throw new Error('GenesisConfig not initialized');
        return GenesisConfig._config.GENESIS_BLOCK;
    }

    /**
     * @type {Hash}
     */
    static get GENESIS_HASH() {
        if (!GenesisConfig._config) throw new Error('GenesisConfig not initialized');
        if (!GenesisConfig._config.GENESIS_HASH) {
            GenesisConfig._config.GENESIS_HASH = GenesisConfig._config.GENESIS_BLOCK.hash();
        }
        return GenesisConfig._config.GENESIS_HASH;
    }

    /**
     * @type {string}
     */
    static get GENESIS_ACCOUNTS() {
        if (!GenesisConfig._config) throw new Error('GenesisConfig not initialized');
        return GenesisConfig._config.GENESIS_ACCOUNTS;
    }

    /**
     * @type {Array.<PeerAddress>}
     */
    static get SEED_PEERS() {
        if (!GenesisConfig._config) throw new Error('GenesisConfig not initialized');
        return GenesisConfig._config.SEED_PEERS;
    }

    /**
     * @type {Array.<SeedList>}
     */
    static get SEED_LISTS() {
        if (!GenesisConfig._config) throw new Error('GenesisConfig not initialized');
        return GenesisConfig._config.SEED_LISTS;
    }

    /**
     * @param {number} networkId
     * @return {string}
     */
    static networkIdToNetworkName(networkId) {
        for (const key of Object.keys(GenesisConfig.CONFIGS)) {
            const config = GenesisConfig.CONFIGS[key];
            if (networkId === config.NETWORK_ID) {
                return config.NETWORK_NAME;
            }
        }
        throw new Error(`Unable to find networkName for networkId ${networkId}`);
    }

    /**
     * @param {number|string} networkId
     * @return {number}
     */
    static networkIdFromAny(networkId) {
        if (typeof networkId === 'number') return networkId;
        if (GenesisConfig.CONFIGS[networkId]) {
            return GenesisConfig.CONFIGS[networkId].NETWORK_ID;
        }
        throw new Error(`Unable to find networkId for ${networkId}`);
    }
}
Class.register(GenesisConfig);

GenesisConfig.CONFIGS = {
    'main': {
        NETWORK_ID: 12,
        NETWORK_NAME: 'main',
        SEED_PEERS: [
            WssPeerAddress.seed('seed01.bitcoinkrypton.org', 12011, '04143328b182fff3eb256965facd64e1118a4ba178948bf3c637c710030e7baed9071648a2820b4db6b3292af40666762502f3e047081794749342f8961970cc8f'),
            WssPeerAddress.seed('seed02.bitcoinkrypton.org', 12011, '04f8f6acd936e00d2821ca4c86688b0a1b54cc667a97345206b529aa4c454ed01d1195780daabebdc9134bc1e1f1b8fbed2dfc3c84b9b50c885209f4fd7108a76b'),
            WssPeerAddress.seed('seed03.bitcoinkrypton.org', 12011, '0436078e77de395ad64ec84485e3eaed032cc8ff708d95ea703c0820d2ff7a818c8a233e98d5a4150e4af9087fe11c488870d9d03865860e25aaf48af16be8a8a0'),
            WssPeerAddress.seed('seed04.bitcoinkrypton.org', 12011, '04155b8997fa8f5ad8216e41c5d58fe9e91ee52b24c2cffb97279d5d637cb837d27bc339706cbefddfeb7e12220a13cdff1a31a964eae9b276f921bad11d0a76f6'),
            WssPeerAddress.seed('seed05.bitcoinkrypton.org', 12011, '0483bec706614f494b53d4bf3eaf83caa2170d80d6b242c93775f30d46ae0baa171607c8597e1a25d341a87ab6be39fa2257515fc2dbeb728936c6b5f645dbc93a'),
            WssPeerAddress.seed('seed06.bitcoinkrypton.org', 12011, '04714e3a666bdfe4e2444ac29c0981a8976cda9b890c7a3920430888cdda09f6cd5ee22e847470c3170f8451f576e9c74e18e22ab4701a16642cdc88ee99299431'),
            WssPeerAddress.seed('seed07.bitcoinkrypton.org', 12011, '0401f508ac13e913aa9a1e6f431ff7afe62c8eae198b5bb328ef77cceea46a1cb34eea5ce2eeb81c33b84ae36b7d51f0504b52c7f3b1887e22ac236b6b9887e938'),
        ],
        SEED_LISTS: [],
        GENESIS_BLOCK: new Block(
            new BlockHeader(
                new Hash(null),
                new Hash(null),
                Hash.fromBase64('B5Nsxzy9moSfaW9aiKaOBBdnt49C9KLJcodqWYn89ho='),
                Hash.fromBase64('kJ4HmfCa5gsw9jfAZTFOf2yIek/3W7cVBcurUgeRDFk='),
                BlockUtils.difficultyToCompact(1),
                1,
                1727060400,
                72437,
                BlockHeader.Version.V1),
            new BlockInterlink([], new Hash(null)),
            new BlockBody(Address.fromBase64('AAAAAAAAAAAAAAAAAAAAAAAAAAA='), [], BufferUtils.fromBase64('UURFeU1URmtiR009'))
        ),
        GENESIS_ACCOUNTS: 'AAA='
    },

    'test': {
        NETWORK_ID: 1,
        NETWORK_NAME: 'test',
        SEED_PEERS: [
            WsPeerAddress.seed('0.0.0.0', 12011, '044e14e7d889b29ed7e1fdd8214d81f649955ec2bf5ffc6f42c396442ad1e95b119fe88e404158922062afc46d61053b0a8f2d65ad49c6c65917cf0efe1e4f39b8'),
        ],
        SEED_LISTS: [],
        GENESIS_BLOCK: new Block(
            new BlockHeader(
                new Hash(null),
                new Hash(null),
                Hash.fromBase64('9rorv34UeKIJBXAARx1z+9wo3wtxd0fZKc/egpxBIPY='),
                Hash.fromBase64('kJ4HmfCa5gsw9jfAZTFOf2yIek/3W7cVBcurUgeRDFk='),
                BlockUtils.difficultyToCompact(1),
                1,
                1720681200,
                97603,
                BlockHeader.Version.V1),
            new BlockInterlink([], new Hash(null)),
            new BlockBody(Address.fromBase64('AAAAAAAAAAAAAAAAAAAAAAAAAAA='), [], BufferUtils.fromBase64('VGVzdE5ldA=='))
        ),
        GENESIS_ACCOUNTS: 'AAA='
    },

    'dev': {
        NETWORK_ID: 2,
        NETWORK_NAME: 'dev',
        SEED_PEERS: [],
        SEED_LISTS: [],
        GENESIS_BLOCK: new Block(
            new BlockHeader(
                new Hash(null),
                new Hash(null),
                Hash.fromBase64('JvMr9c9l2m8HWNdFAGTEastKH+aDZvln9EopXelhVIg='),
                Hash.fromBase64('1t/Zm91tN0p178+ePcxyR5bPxvC6jFLskqiidFFO3wY='),
                BlockUtils.difficultyToCompact(1),
                1,
                1522338300,
                12432,
                BlockHeader.Version.V1),
            new BlockInterlink([], new Hash(null)),
            new BlockBody(Address.fromBase64('AAAAAAAAAAAAAAAAAAAAAAAAAAA='), [], BufferUtils.fromBase64('RGV2TmV0'))
        ),
        GENESIS_ACCOUNTS: 'AAA='
    }
};
