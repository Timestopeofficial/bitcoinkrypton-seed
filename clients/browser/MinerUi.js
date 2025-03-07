class MinerUi {
    constructor(el, $) {
        this.$el = el;
        this.$ = $;
        this._lastMinedBlockTimestamp = null;

        this.$minerTitle = this.$el.querySelector('[miner-title]');
        this.$minerTitle.addEventListener('click', () => this._toggleTitle());

        this._minerAddress = new AccountSelector(this.$el.querySelector('[miner-address]'), $);
        this.$modeSelector = this.$el.querySelector('[miner-mode-selector]');
        this.$serverSelector = this.$el.querySelector('[pool-server-selector]');
        this.$poolConnectionState = this.$el.querySelector('[pool-connection-state]');
        this.$working = this.$el.querySelector('[working]');
        this.$hashrate = this.$el.querySelector('[hashrate]');
        this.$lastMinedBlockTimeStamp = this.$el.querySelector('[last-mined-block-timestamp]');
        this.$startButton = this.$el.querySelector('[start-button]');

        // Nano clients can only use nano mining mode.
        if ($.clientType === DevUi.ClientType.NANO || $.clientType === DevUi.ClientType.PICO) {
            this.$el.querySelector('[miner-mode-solo]').disabled = true;
            this.$el.querySelector('[miner-mode-smart]').disabled = true;
            this.$el.querySelector('[miner-mode-nano]').selected = true;
        }

        $.client.addConsensusChangedListener(state => {
            if (state === Krypton.Client.ConsensusState.ESTABLISHED) {
                this._onConsensusEstablished();
            } else {
                this._onConsensusLost();
            }
        });
        this.$modeSelector.addEventListener('change', () => this._selectMode());
        this.$startButton.addEventListener('click', () => this._toggleMining());
        this._minerAddress.on('account-selected', address => $.miner.address = address);

        this._selectMode();
        this._minerChanged();
    }

    /** @async */
    _toggleTitle() {
        if(window.outerWidth <= 768) {
            const titleParentNode = this.$el.parentNode.parentNode.getElementsByClassName("info")
            for (let index = 0; index < titleParentNode.length; index++) {
                titleParentNode[index].classList.add('collapsed')
            }
        }
        
        if (this.$el.classList.contains('collapsed')) this.$el.classList.remove('collapsed');
        else this.$el.classList.add('collapsed');
    }

    _selectMode() {
        if (this.$.miner && this.$.miner.working) {
            this._stopMining();
        }

        this._mode = this.$modeSelector.value;

        let miner;
        switch (this._mode) {
            case 'solo':
                miner = new Krypton.Miner(this.$.blockchain, this.$.accounts, this.$.mempool, this.$.network.time, /*address*/ null);
                break;
            case 'smart': {
                const deviceId = Krypton.BasePoolMiner.generateDeviceId(this.$.network.config);
                miner = new Krypton.SmartPoolMiner(this.$.blockchain, this.$.accounts, this.$.mempool, this.$.network.time, /*address*/ null, deviceId);
                break;
            }
            case 'nano': {
                const deviceId = Krypton.BasePoolMiner.generateDeviceId(this.$.network.config);
                miner = new Krypton.NanoPoolMiner(this.$.blockchain, this.$.network.time, /*address*/ null, deviceId);
                break;
            }
        }
        
        this.$el.setAttribute(MinerUi.ATTRIBUTE_MINING_TYPE, this._mode);
        this.$.miner = miner;
        miner.address = this._minerAddress.selectedAddress;
        miner.on('start', () => this._minerChanged());
        miner.on('stop', () => this._minerChanged());
        miner.on('hashrate-changed', () => this._minerChanged());
        miner.on('block-mined', () => this._blockMined());
    }


    notifyAccountsChanged() {
        this._minerAddress.notifyAccountsChanged();
    }

    _onConsensusEstablished() {
        //this.$startButton.removeAttribute('disabled');
    }

    _onConsensusLost() {
        this.$.miner.stopWork();
        //this.$startButton.setAttribute('disabled', '');
    }

    _toggleMining() {
        //if (!this.$.consensus.established) {
        //    console.warn('Not starting miner - consensus not established');
        //    return;
        //}
        if (!this.$.miner.working && this.$.miner.address) {
            this._startMining();
        } else {
            this._stopMining();
        }
    }

    _startMining() {
        const [host, port] = this.$serverSelector.value.split(':');
        switch (this._mode) {
            case 'solo':
                this.$.miner.startWork();
                break;
            case 'smart':
                this.$.miner.on('connection-state', () => {
                    this._minerChanged();
                    if (this.$.miner.isConnected()) {
                        this.$.miner.startWork();
                    }
                });
                this.$.miner.connect(host, port);
                break;
            case 'nano':
                this.$.miner.on('connection-state', () => this._minerChanged());
                this.$.miner.connect(host, port);
        }
        this.$startButton.classList.add('started');
    }

    _stopMining() {
        this.$.miner.stopWork();
        if (this.$.miner instanceof Krypton.BasePoolMiner) {
            this.$.miner.disconnect();
        }
        this.$startButton.classList.remove('started');
    }

    _minerChanged() {
        let connectionState;
        switch (this.$.miner.connectionState) {
            case Krypton.BasePoolMiner.ConnectionState.CONNECTED:
                connectionState = 'connected';
                if (this.$.miner.balance !== undefined) {
                    connectionState += ` (${Krypton.Policy.satoshisToCoins(this.$.miner.balance).toString()} BTCK, confirmed ${Krypton.Policy.satoshisToCoins(this.$.miner.confirmedBalance).toString()} BTCK)`;
                }
                break;
            case Krypton.BasePoolMiner.ConnectionState.CONNECTING:
                connectionState = 'connecting';
                break;
            case Krypton.BasePoolMiner.ConnectionState.CLOSED:
                connectionState = 'closed';
                break;
            default:
                connectionState = 'n/a';
        }
        this.$poolConnectionState.textContent = connectionState;

        this.$working.textContent = this.$.miner.working;
        this.$hashrate.textContent = this.$.miner.hashrate;
        this.$lastMinedBlockTimeStamp.textContent = this._lastMinedBlockTimestamp ?
            new Date(this._lastMinedBlockTimestamp) : '-';
        if (this.$.miner.working) {
            this.$startButton.textContent = 'Stop Mining';
        } else {
            this.$startButton.textContent = 'Start Mining';
        }
    }

    _blockMined() {
        this._lastMinedBlockTimestamp = Date.now();
        this._minerChanged();
    }
}
MinerUi.ATTRIBUTE_MINING_TYPE = 'miner-mode';