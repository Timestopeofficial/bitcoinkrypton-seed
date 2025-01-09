class TransactionUi extends Krypton.Observable {
    constructor(el, $) {
        super();
        this.$el = el;
        this.$ = $;
        this._transactionType = null;

        this.$typeSelector = this.$el.querySelector('[tx-type-selector]');

        this._senderUi = new SignerUi(el.querySelector('[sender-ui]'), $);

        this.$transactionTitle = this.$el.querySelector('[transaction-title]');
        this.$transactionTitle.addEventListener('click', () => this._toggleTitle());

        this.$plainSender = this.$el.querySelector('[tx-plain-sender]');
        this.$plainSenderType = this.$el.querySelector('[tx-plain-sender-type]');
        this.$recipient = this.$el.querySelector('[tx-recipient]');
        this.$recipientType = this.$el.querySelector('[tx-recipient-type]');
        this.$value = this.$el.querySelector('[tx-value]');
        // this.$fee = this.$el.querySelector('[tx-fee]');
        this.$validityStart = this.$el.querySelector('[tx-validity-start]');
        this.$freeformData = this.$el.querySelector('[tx-freeform-data]');
        this.$plainFlags = this.$el.querySelector('[tx-plain-flags]');
        this.$plainData = this.$el.querySelector('[tx-plain-data]');
        this.$plainProof = this.$el.querySelector('[tx-plain-proof]');

        this._vestingOwner = new AccountSelector(this.$el.querySelector('[tx-vesting-owner]'), $);
        this.$vestingStepBlocks = this.$el.querySelector('[tx-vesting-step-blocks]');
        this.$vestingStepAmount = this.$el.querySelector('[tx-vesting-step-amount]');
        this.$vestingStart = this.$el.querySelector('[tx-vesting-start]');
        this.$vestingTotalAmount = this.$el.querySelector('[tx-vesting-total-amount]');

        this._htlcSender = new AccountSelector(this.$el.querySelector('[tx-htlc-sender]'), $);
        this._htlcRecipient = new AccountSelector(this.$el.querySelector('[tx-htlc-recipient]'), $);
        this.$htlcHashAlgo = this.$el.querySelector('[tx-htlc-hash-algo]');
        this.$htlcHashPreImage = this.$el.querySelector('[tx-htlc-hash-pre-image]');
        this.$htlcHashCount = this.$el.querySelector('[tx-htlc-hash-count]');
        this.$htlcTimeout = this.$el.querySelector('[tx-htlc-timeout]');

        this.$contractAddress = this.$el.querySelector('[contract-address]');
        // this.$generateButton = this.$el.querySelector('[tx-generate]');
        this.$sendButton = this.$el.querySelector('[tx-send]');
        // this.$clearButton = this.$el.querySelector('[tx-clear]');

        $.client.addConsensusChangedListener(state => {
            if (state === Krypton.Client.ConsensusState.ESTABLISHED) {
                this.$sendButton.removeAttribute('disabled')
            } else {
                this.$sendButton.setAttribute('disabled', '')
            }
        });
        this.$typeSelector.addEventListener('change', () => this._onTransactionTypeSelected());
        this.$sendButton.addEventListener('click', e => this._onSendTransactionClick(e));
        // this.$generateButton.addEventListener('click', e => this._onGenerateTransactionClick(e));
        // this.$clearButton.addEventListener('click', e => this._onClearClick(e));
        this.$recipient.addEventListener('input', () => this._onRecipientChanged());

        this._getDefaultValidityStart().then(height => this.$validityStart.setAttribute('placeholder', height));
        $.client.addHeadChangedListener(
            () => this._getDefaultValidityStart().then(height => this.$validityStart.setAttribute('placeholder', height)));

        this._onTransactionTypeSelected();
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

    notifyAccountsChanged() {
        this._senderUi.notifyAccountsChanged();
        this._vestingOwner.notifyAccountsChanged();
        this._htlcSender.notifyAccountsChanged();
        this._htlcRecipient.notifyAccountsChanged();
    }

    _onTransactionTypeSelected() {
        const txType = this.$typeSelector.value;
        if (Object.values(TransactionUi.TxType).indexOf(txType) === -1) {
            alert(`Unknown transaction type ${txType}`);
            return;
        }
        this._transactionType = txType;
        this.$el.setAttribute(TransactionUi.ATTRIBUTE_TX_TYPE, txType);
        this._senderUi.signerTypesToOffer = txType === TransactionUi.TxType.BASIC
            ? [SignerUi.SignerType.SINGLE_SIG, SignerUi.SignerType.MULTI_SIG]
            : [SignerUi.SignerType.SINGLE_SIG, SignerUi.SignerType.MULTI_SIG, SignerUi.SignerType.VESTING,
                SignerUi.SignerType.HTLC];
    }

    _onRecipientChanged() {
        const recipient = Utils.readAddress(this.$recipient);
        if (recipient === null) return;
        Utils.getAccount(this.$, recipient).then(account => this.$recipientType.value = account.type);
    }

    // _onGenerateTransactionClick(e) {
    //     if (e) e.preventDefault();
    //     this._generateSignedTransaction(false).then(tx => {
    //         this.$typeSelector.value = TransactionUi.TxType.PLAIN;
    //         this._onTransactionTypeSelected();
    //         this.$plainSender.value = tx.sender.toUserFriendlyAddress();
    //         this.$plainSenderType.value = tx.senderType;
    //         this.$recipient.value = tx.recipient.toUserFriendlyAddress();
    //         this.$recipientType.value = tx.recipientType;
    //         this.$value.value = Krypton.Policy.satoshisToCoins(tx.value).toString();
    //         this.$fee.value = Krypton.Policy.satoshisToCoins(tx.fee).toString();
    //         this.$validityStart.value = tx.validityStartHeight;
    //         this.$plainFlags.value = tx.flags;
    //         this.$plainData.value = Krypton.BufferUtils.toBase64(tx.data);
    //         this.$plainProof.value = Krypton.BufferUtils.toBase64(tx.proof);
    //     });
    // }

    _onSendTransactionClick(e) {
        e.preventDefault();
        this.$transactionTitle.classList.remove('error')
        this.$transactionTitle.classList.remove('warning')
        this.$transactionTitle.classList.remove('expire')
        this.$transactionTitle.classList.remove('success')

        let transaction;
        this._generateSignedTransaction(true).then(tx => {
            transaction = tx;
            return Utils.broadcastTransaction(this.$, transaction);
        }).then((result) => {
            if(result.state === 'invalidated') this.$transactionTitle.classList.add('error')
            else if (result.state === 'pending') this.$transactionTitle.classList.add('warning')
            else if (result.state === 'expired') this.$transactionTitle.classList.add('expire')
            else if (result.state === 'new') this.$transactionTitle.classList.add('success')

            if (transaction.hasFlag(Krypton.Transaction.Flag.CONTRACT_CREATION)) {
                const contractAddress = transaction.getContractCreationAddress();
                this.$contractAddress.parentNode.style.display = 'block';
                this.$contractAddress.textContent = contractAddress.toUserFriendlyAddress();
                this.fire('contract-created', contractAddress);
            } else {
                this.$contractAddress.parentNode.style.display = 'none';
            }
        });
    }

    _onClearClick(e) {
        e.preventDefault();
        Array.prototype.forEach.call(this.$el.querySelectorAll('input,select'), input => {
            input.value = '';
            input.classList.remove('error');
        });
        this.$contractAddress.textContent = '';
    }   

    _readTransactionCanonicals() {
        let value = Utils.readNumber(this.$value);
        let fee = 0;
        // if (this.$fee.value === '') {
        //     fee = 0;
        //     this.$fee.classList.remove('error');
        // } else {
        //     fee = Utils.readNumber(this.$fee);
        // }
        let validityStart;
        if (this.$validityStart.value === '') {
            validityStart = parseInt(this.$validityStart.getAttribute('placeholder'));
            this.$validityStart.classList.remove('error');
        } else {
            validityStart = Utils.readNumber(this.$validityStart);
        }
        if (value === null || fee === null || validityStart === null) return null;
        value = Krypton.Policy.coinsToSatoshis(value);
        fee = Krypton.Policy.coinsToSatoshis(fee);
        return {
            value: value,
            fee: fee,
            validityStart: validityStart
        };
    }

    /* async */
    _getDefaultValidityStart() {
        return this.$.client.getHeadHeight().then(height => height + 1);
    }

    /* async */
    _generateSignedTransaction(useUserProvidedPlainProof) {
        if (this._transactionType === TransactionUi.TxType.PLAIN && useUserProvidedPlainProof) {
            // for plain transactions the user can provide the signature proof
            const tx = this._generatePlainExtendedTransaction();
            if (!tx) throw Error('Failed to generate transaction.');
            return Promise.resolve(tx);
        } else {
            return this._senderUi.getSigner().then(sender => {
                if (!sender) throw Error('Failed to retrieve sender.');
                const tx = this._generateTransaction(sender);
                if (!tx) throw Error('Failed to generate transaction.');
                const signResult = sender.sign(tx);
                tx.signature = signResult.signature;
                tx.proof = signResult.proof;
                return tx;
            });
        }
    }

    _generateTransaction(sender) {
        switch(this._transactionType) {
            case TransactionUi.TxType.BASIC:
                return this._generateBasicTransaction(sender);
            case TransactionUi.TxType.GENERAL:
                return this._generateGeneralTransaction(sender);
            case TransactionUi.TxType.VESTING:
                return this._generateVestingCreationTransaction(sender);
            case TransactionUi.TxType.HTLC:
                return this._generateHtlcCreationTransaction(sender);
            case TransactionUi.TxType.PLAIN:
                return this._generatePlainExtendedTransaction();
            default:
                alert('Transaction Type not implemented yet');
                return null;
        }
    }

    _generateBasicTransaction(sender) {
        const canonicals = this._readTransactionCanonicals();
        const recipient = Utils.readAddress(this.$recipient);
        if (canonicals === null || recipient === null) return null;
        return new Krypton.BasicTransaction(sender.publicKey, recipient,
            canonicals.value, canonicals.validityStart);
    }

    _generateGeneralTransaction(sender) {
        const canonicals = this._readTransactionCanonicals();
        const recipient = Utils.readAddress(this.$recipient);
        const recipientType = Utils.readNumber(this.$recipientType);
        if (canonicals === null || recipient === null || recipientType === null) return null;
        const freeformData = Krypton.BufferUtils.fromAscii(this.$freeformData.value);
        return new Krypton.ExtendedTransaction(sender.address, sender.type, recipient, recipientType, canonicals.value,
            canonicals.validityStart, Krypton.Transaction.Flag.NONE, freeformData);
    }

    _generatePlainExtendedTransaction() {
        const canonicals = this._readTransactionCanonicals();
        const senderAddress = Utils.readAddress(this.$plainSender);
        const senderType = Utils.readNumber(this.$plainSenderType);
        const recipient = Utils.readAddress(this.$recipient);
        const recipientType = Utils.readNumber(this.$recipientType);
        const flags = Utils.readNumber(this.$plainFlags);
        const data = Utils.readBase64(this.$plainData);
        const proof = Utils.readBase64(this.$plainProof);
        if (canonicals === null || senderAddress === null || senderType === null || recipient === null ||
            recipientType === null || flags === null || data === null || proof === null) {
            return null;
        }
        return new Krypton.ExtendedTransaction(senderAddress, senderType, recipient, recipientType,
            canonicals.value, canonicals.validityStart, flags, data, proof);
    }

    _generateVestingCreationTransaction(sender) {
        const canonicals = this._readTransactionCanonicals();
        const vestingOwner = this._vestingOwner.selectedAddress;
        const vestingStepBlocks = Utils.readNumber(this.$vestingStepBlocks);
        if (canonicals === null || vestingOwner === null || vestingStepBlocks === null) return null;

        const requiresVestingTotalAmount = this.$vestingTotalAmount.value !== '';
        const requiresVestingStartAndStepAmount = this.$vestingStart.value !== ''
            || this.$vestingStepAmount.value !== '' || requiresVestingTotalAmount;

        const bufferSize = vestingOwner.serializedSize + /* vestingStepBlocks*/ 4
            + (requiresVestingStartAndStepAmount? /* vestingStart */ 4 + /* vestingStepAmount */ 16 : 0)
            + (requiresVestingTotalAmount? /* vestingTotalAmount */ 16 : 0);

        let vestingStart, vestingStepAmount, vestingTotalAmount;

        if (requiresVestingStartAndStepAmount) {
            vestingStart = Utils.readNumber(this.$vestingStart);
            vestingStepAmount = Utils.readNumber(this.$vestingStepAmount);
            if (vestingStart === null || vestingStepAmount === null) return null;
            vestingStepAmount = Krypton.Policy.coinsToSatoshis(vestingStepAmount);
        }
        if (requiresVestingTotalAmount) {
            vestingTotalAmount = Utils.readNumber(this.$vestingTotalAmount);
            if (vestingTotalAmount === null) return null;
            vestingTotalAmount = Krypton.Policy.coinsToSatoshis(vestingTotalAmount);
        }

        const buffer = new Krypton.SerialBuffer(bufferSize);
        vestingOwner.serialize(buffer);

        if (requiresVestingStartAndStepAmount) {
            buffer.writeUint32(vestingStart);
            buffer.writeUint32(vestingStepBlocks);
            buffer.writeUint128(vestingStepAmount);
            if (requiresVestingTotalAmount) {
                buffer.writeUint128(vestingTotalAmount);
            }
        } else {
            buffer.writeUint32(vestingStepBlocks);
        }

        const recipient = Krypton.Address.CONTRACT_CREATION;
        const recipientType = Krypton.Account.Type.VESTING;
        const flags = Krypton.Transaction.Flag.CONTRACT_CREATION;
        return new Krypton.ExtendedTransaction(sender.address, sender.type, recipient, recipientType,
            canonicals.value, canonicals.validityStart, flags, buffer);
    }

    _generateHtlcCreationTransaction(sender) {
        const canonicals = this._readTransactionCanonicals();
        const htlcSender = this._htlcSender.selectedAddress;
        const htlcRecipient = this._htlcRecipient.selectedAddress;
        const hashAlgo = Krypton.Hash.Algorithm[this.$htlcHashAlgo.value.toUpperCase()];
        const hashCount = Utils.readNumber(this.$htlcHashCount);
        const timeout = Utils.readNumber(this.$htlcTimeout);
        if (canonicals === null || htlcSender === null || htlcRecipient === null || hashAlgo === undefined
            || hashCount === null || timeout === null) return null;

        let hashRoot = Krypton.BufferUtils.fromAscii(this.$htlcHashPreImage.value);
        hashRoot = Utils.hash(hashRoot, hashAlgo); // hash once to make sure we get a hash
        for (let i = 0; i < hashCount; ++i) {
            hashRoot = Utils.hash(hashRoot, hashAlgo);
        }

        const bufferSize = htlcSender.serializedSize
            + htlcRecipient.serializedSize
            + /* hashAlgo */ 1
            + hashRoot.byteLength
            + /* hashCount */ 1
            + /* timeout */ 4;
        const buffer =  new Krypton.SerialBuffer(bufferSize);
        htlcSender.serialize(buffer);
        htlcRecipient.serialize(buffer);
        buffer.writeUint8(hashAlgo);
        buffer.write(hashRoot);
        buffer.writeUint8(hashCount);
        buffer.writeUint32(timeout);

        const recipient = Krypton.Address.CONTRACT_CREATION;
        const recipientType = Krypton.Account.Type.HTLC;
        const flags = Krypton.Transaction.Flag.CONTRACT_CREATION;
        return new Krypton.ExtendedTransaction(sender.address, sender.type, recipient, recipientType,
            canonicals.value, canonicals.validityStart, flags, buffer);
    }
}
TransactionUi.ATTRIBUTE_TX_TYPE = 'tx-type';
TransactionUi.TxType = {
    PLAIN: 'plain',
    BASIC: 'basic',
    GENERAL: 'general',
    VESTING: 'vesting-creation',
    HTLC: 'htlc-creation'
};
