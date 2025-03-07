class AccountInfoUi {
    constructor(el, $) {
        this.$el = el;

        this.$accountInfoTitle = this.$el.querySelector('[account-info-title]');
        this.$accountInfoTitle.addEventListener('click', () => this._toggleTitle());

        this.$addressInput = this.$el.querySelector('[address-input]');
        this.$clearButton = this.$el.querySelector('[clear-button]');
        this.$address = this.$el.querySelector('[address]');
        this.$balance = this.$el.querySelector('[balance]');

        this.$vestingOwner = this.$el.querySelector('[vesting-owner]');
        this.$vestingStart = this.$el.querySelector('[vesting-start]');
        this.$vestingStepBlocks = this.$el.querySelector('[vesting-step-blocks]');
        this.$vestingStepAmount = this.$el.querySelector('[vesting-step-amount]');
        this.$vestingTotalAmount = this.$el.querySelector('[vesting-total-amount]');
        this.$vestingCurrentCap = this.$el.querySelector('[vesting-current-cap]');
        this.$vestingCurrentlyTransferable = this.$el.querySelector('[vesting-currently-transferable]');

        this.$htlcSender = this.$el.querySelector('[htlc-sender]');
        this.$htlcRecipient = this.$el.querySelector('[htlc-recipient]');
        this.$htlcHashRoot = this.$el.querySelector('[htlc-hash-root]');
        this.$htlcHashCount = this.$el.querySelector('[htlc-hash-count]');
        this.$htlcTimeout = this.$el.querySelector('[htlc-timeout]');
        this.$htlcTotalAmount = this.$el.querySelector('[htlc-total-amount]');
        
        this.$ = $;
        this._address = null;
        this._consensusState = Krypton.Client.ConsensusState.CONNECTING;
        this._reset();

        this.$addressInput.addEventListener('input', () => this._onAddressInput());
        this.$clearButton.addEventListener('click', () => this._reset());
        this.$.client.addHeadChangedListener(() => this._update());
        this.$.client.addConsensusChangedListener((state) => {
            this._consensusState = state;
            if (state === Krypton.Client.ConsensusState.ESTABLISHED) this._update();
        });
    }

    set address(address) {
        this._setAddress(address);
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

    _reset() {
        this.$addressInput.value = '';
        this.$.walletStore.hasDefault().then(hasDefault => {
            if (hasDefault) {
                this.$.walletStore.getDefault().then(defaultWallet => {
                    this._setAddress(defaultWallet.address);
                    this.$addressInput.setAttribute('placeholder', defaultWallet.address.toUserFriendlyAddress());
                });
            } else {
                this._address = null;
                this.$addressInput.setAttribute('placeholder', 'Enter Address');
            }
        });
    }

    _setAddress(address) {
        this._address = address;
        this.$address.textContent = address.toUserFriendlyAddress();
        this._update();
    }

    _onAddressInput() {
        const userFriendlyAddress = this.$addressInput.value;
        if (userFriendlyAddress === '') {
            this._reset();
            return;
        }
        let address;
        try {
            address = Krypton.Address.fromUserFriendlyAddress(userFriendlyAddress);
        } catch(e) {
            this.$addressInput.classList.add('error');
            return;
        }
        this.$addressInput.classList.remove('error');
        this._setAddress(address);
    }

    _update(head, rebranching) {
        if (!this._address
            || this.$.clientType === DevUi.ClientType.NANO && (this._consensusState !== Krypton.Client.ConsensusState.ESTABLISHED || rebranching)) {
            return; // updates are expensive on nano, so don't do it till consensus
        }
        Utils.getAccount(this.$, this._address).then(account => {
            this.$balance.textContent = Utils.satoshisToCoins(account.balance);
            switch (account.type) {
                case Krypton.Account.Type.BASIC:
                    this.$el.setAttribute(AccountInfoUi.ATTRIBUTE_ACCOUNT_TYPE, AccountInfoUi.AccountType.BASIC);
                    break;
                case Krypton.Account.Type.VESTING:
                    this.$el.setAttribute(AccountInfoUi.ATTRIBUTE_ACCOUNT_TYPE, AccountInfoUi.AccountType.VESTING);
                    this._updateVestingDetails(account);
                    break;
                case Krypton.Account.Type.HTLC:
                    this.$el.setAttribute(AccountInfoUi.ATTRIBUTE_ACCOUNT_TYPE, AccountInfoUi.AccountType.HTLC);
                    this._updateHtlcDetails(account);
                    break;
                default:
                    this.$el.setAttribute(AccountInfoUi.ATTRIBUTE_ACCOUNT_TYPE, AccountInfoUi.AccountType.UNKNOWN);
            }
        });
    }

    _updateVestingDetails(contract) {
        this.$vestingOwner.textContent = contract.owner.toUserFriendlyAddress();
        this.$vestingStart.textContent = contract.vestingStart;
        this.$vestingStepBlocks.textContent = contract.vestingStepBlocks;
        this.$vestingStepAmount.textContent = Utils.satoshisToCoins(contract.vestingStepAmount);
        this.$vestingTotalAmount.textContent = Utils.satoshisToCoins(contract.vestingTotalAmount);
        this.$.client.getHeadHeight().then(height => {
            const currentMinCap = contract.getMinCap(height);
            this.$vestingCurrentCap.textContent = Utils.satoshisToCoins(currentMinCap);
            this.$vestingCurrentlyTransferable.textContent = Utils.satoshisToCoins(Krypton.BigNumber.max(0, contract.balance.minus(currentMinCap)));
        });
    }

    _updateHtlcDetails(contract) {
        this.$htlcSender.textContent = contract.sender.toUserFriendlyAddress();
        this.$htlcRecipient.textContent = contract.recipient.toUserFriendlyAddress();
        this.$htlcHashRoot.textContent = contract.hashRoot.toBase64();
        this.$htlcHashCount.textContent = contract.hashCount;
        this.$htlcTimeout.textContent = contract.timeout;
        this.$htlcTotalAmount.textContent = Utils.satoshisToCoins(contract.totalAmount);
    }
}
AccountInfoUi.ATTRIBUTE_ACCOUNT_TYPE = 'account-type';
AccountInfoUi.AccountType = {
    UNKNOWN: 'unknown',
    BASIC: 'basic',
    VESTING: 'vesting',
    HTLC: 'htlc'
};

