class DevUi {
    constructor(el) {
        this.$el = el;
        this.$overlay = el.querySelector('[overlay]');
        this.$mainUi = el.querySelector('[main-ui]');
        [this.clientType, this.networkName] = location.hash.substr(1).split('-');
        // Autoset to light mode for web
        this.clientType = 'light';
        if (Object.values(DevUi.ClientType).indexOf(this.clientType) === -1) return;
        this.$el.setAttribute('client', this.clientType);
        this.$mainUi.style.display = 'flex';
        this._startInstance(this.clientType).then($ => {
            this.$ = $;
            window.$ = $;
            $.timeStart = Date.now();
            return this._loadUiComponents(); // load ui components after core as some extend Krypton.Observable
        }).then(() => this._initUi());
        // Hide contents for mobile
        if(window.outerWidth <= 768) {
            const titleParentNode = this.$el.getElementsByClassName("info")
            for (let index = 1; index < titleParentNode.length; index++) {
                titleParentNode[index].classList.add('collapsed')
            }
        }
    }

    _initUi() {
        this._accountsUi = new AccountsUi(this.$el.querySelector('[accounts-ui]'), this.$);
        this._accountInfoUi = new AccountInfoUi(this.$el.querySelector('[account-info-ui]'), this.$);
        this._transactionUi = new TransactionUi(this.$el.querySelector('[transaction-ui]'), this.$);
        this._blockchainUi = new BlockchainUi(this.$el.querySelector('[blockchain-ui]'), this.$);
        this._mempoolUi = new MempoolUi(this.$el.querySelector('[mempool-ui]'), this.$);
        this._networkUi = new NetworkUi(this.$el.querySelector('[network-ui]'), this.$);
        this._minerUi = new MinerUi(this.$el.querySelector('[miner-ui]'), this.$);

        this._accountsUi.on('account-selected', address => this._accountInfoUi.address = address);
        this._accountsUi.on('accounts-changed', () => {
            this._transactionUi.notifyAccountsChanged();
            this._accountsUi.notifyAccountsChanged();
            if (this._minerUi) {
                this._minerUi.notifyAccountsChanged();
            }
        });
        this._transactionUi.on('contract-created', address => this._accountsUi.addAccount(address));
    }

    _loadUiComponents() {
        const scripts = ['BlockchainUi.js', 'AccountInfoUi.js', 'TransactionUi.js', 'MempoolUi.js',
            'MinerUi.js', 'NetworkUi.js', 'AccountSelector.js', 'Signer.js', 'HtlcSignerUi.js', 'SignerUi.js',
            'AccountsUi.js', 'MultiSigWalletCreationUi.js', 'MultiSigSignerUi.js'];
        return Promise.all(scripts.map(script => Utils.loadScript(script)));
    }

    _startInstance() {
        return new Promise(resolve => {
            Krypton.init(() => {
                const $ = {};
                $.clientType = this.clientType;
                const config = Krypton.GenesisConfig.CONFIGS[this.networkName] || Krypton.GenesisConfig.CONFIGS['main'];
                Krypton.GenesisConfig.init(config);

                Promise.all([
                    Krypton.Consensus[this.clientType](),
                    new Krypton.WalletStore()
                ]).then(promiseResults => {
                    $.consensus = promiseResults[0];
                    $.client = new Krypton.Client(Krypton.Client.Configuration.builder().feature(Krypton.Client.Feature.MEMPOOL).build(), $.consensus);

                    // XXX Legacy API, still being used for miner at this point.
                    $.blockchain = $.consensus.blockchain;
                    $.mempool = $.consensus.mempool;
                    $.network = $.consensus.network;

                    if (this.clientType !== DevUi.ClientType.NANO && this.clientType !== DevUi.ClientType.PICO) {
                        $.accounts = $.blockchain.accounts;
                    }

                    $.walletStore = promiseResults[1];
                    this.$overlay.style.display = 'none';
                    resolve($);
                });
            }, (code) => {
                switch (code) {
                    case Krypton.ERR_WAIT:
                        this.$overlay.style.display = 'block';
                        break;
                    case Krypton.ERR_UNSUPPORTED:
                        alert('Browser not supported');
                        break;
                    default:
                        alert('Krypton initialization error');
                        break;
                }
            });
        });
    }
}
DevUi.ClientType = {
    PICO: 'pico',
    NANO: 'nano',
    LIGHT: 'light',
    FULL: 'full'
};


window.addEventListener('hashchange', () => window.location.reload());

window.ui = new DevUi(document.getElementById('content'));
