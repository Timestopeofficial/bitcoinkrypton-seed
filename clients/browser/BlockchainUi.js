class BlockchainUi {
    constructor(el, $) {
        this.$el = el;
        this.$ = $;
        this._blockInterlinkCollapsed = true;
        this._blockTransactionsCollapsed = true;

        this.$title = this.$el.querySelector('[title]');
        this.$title.addEventListener('click', () => this._toggleTitle());

        // this.$chainHeight = this.$el.querySelector('[chain-height]');
        this.$totalDifficulty = this.$el.querySelector('[total-difficulty]');
        this.$totalWork = this.$el.querySelector('[total-work]');
        this.$averageBlockTime = this.$el.querySelector('[average-block-time]');
        this.$lastBlockTime = this.$el.querySelector('[last-block-time]');


        this.$blockInfo = this.$el.querySelector('[block-info]');
        this.$blockNotFound = this.$el.querySelector('[block-not-found]');
        this.$blockHeightInput = this.$el.querySelector('[block-height-input]');
        this.$blockHash = this.$el.querySelector('[block-hash]');
        this.$blockPowHash = this.$el.querySelector('[block-pow-hash]');
        this.$blockPrevHash = this.$el.querySelector('[block-prev-hash]');
        this.$blockAccountsHash = this.$el.querySelector('[block-accounts-hash]');
        this.$blockDifficulty = this.$el.querySelector('[block-difficulty]');
        this.$blockTimestamp = this.$el.querySelector('[block-timestamp]');
        this.$blockNonce = this.$el.querySelector('[block-nonce]');
        this.$blockInterlink = this.$el.querySelector('[block-interlink]');
        this.$blockInterlinkTitle = this.$el.querySelector('[block-interlink-title]');
        this.$blockTransactions = this.$el.querySelector('[block-transactions]');
        this.$blockTransactionsTitle = this.$el.querySelector('[block-transactions-title]');
        this.$blockTransactionsCount = this.$el.querySelector('[block-transactions-count]');

        $.client.addHeadChangedListener((hash) => {
            this.$.client.getBlock(hash).then((block) => this._headChanged(block));
        });

        let startTime = Date.now();
        let $timeToFirstConsensus = this.$el.querySelector('[time-to-first-consensus]');
        $.client.addConsensusChangedListener((state) => {
            this.$title.classList.remove('connecting', 'syncing', 'consensus-established');
            switch (state) {
                case Krypton.Client.ConsensusState.CONNECTING:
                    this.$title.classList.add('connecting');
                    break;
                case Krypton.Client.ConsensusState.SYNCING:
                    this.$title.classList.add('syncing');
                    break;
                case Krypton.Client.ConsensusState.ESTABLISHED:
                    this.$title.classList.add('consensus-established');
                    $.client.getHeadBlock().then((head) => this._headChanged(head));
                    if (startTime) {
                        $timeToFirstConsensus.textContent = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
                        startTime = null;
                    }
                    break;
            }
        });

        $.client.getHeadBlock().then((head) => this._headChanged(head));
        const inputEventName = $.clientType === DevUi.ClientType.NANO? 'change' : 'input';
        this.$blockHeightInput.addEventListener(inputEventName, () => this._updateUserRequestedBlock());
        this.$blockInterlinkTitle.addEventListener('click', () => this._toggleBlockInterlink());
        this.$blockTransactionsTitle.addEventListener('click', () => this._toggleTransactions());
    }

    /** @async */
    _toggleTitle() {
        if(window.outerWidth <= 768) {
            const titleParentNode = this.$el.parentNode.parentNode.getElementsByClassName("info")
            for (let index = 0; index < titleParentNode.length; index++) {
                titleParentNode[index].classList.add('collapsed')
            }
        }
        
        if (this.$el.children[0].classList.contains('collapsed')) this.$el.children[0].classList.remove('collapsed');
        else this.$el.children[0].classList.add('collapsed');
    }

    _headChanged(head) {
        // this.$chainHeight.textContent = head.height;
        this.$blockHeightInput.placeholder = head.height;
        this._updateAverageBlockTime();

        if (this.$.clientType !== DevUi.ClientType.NANO) {
            // TODO:
            //  Does it make sense to expose such functionality through Client API?
            //  It is only reliable with full consensus...
            //this.$totalDifficulty.textContent = this.$.blockchain.totalDifficulty;
            //this.$totalWork.textContent = this.$.blockchain.totalWork;
        }

        if (this.$blockHeightInput.value === '') this._showBlockInfo(head);
    }

    _updateAverageBlockTime() {
        this.$.client.getHeadBlock(false).then((head) => {
            const tailHeight = Math.max(head.height - Krypton.Policy.difficultyBlockWindow(head.height), 1);

            this.$.client.getBlockAt(tailHeight, false)
                .then(tailBlock => {
                    const averageBlockTime = ((head.timestamp - tailBlock.timestamp) / Math.max(head.height - tailBlock.height, 1)).toFixed(2);;
                    this.$averageBlockTime.textContent = `${averageBlockTime}s`;
                })
                .catch(() => {
                    this.$averageBlockTime.textContent = 'unknown';
                });

            this.$.client.getBlock(head.prevHash, false)
                .then(prevBlock => {
                    this.$lastBlockTime.textContent = (head.timestamp - prevBlock.timestamp) + 's';
                })
                .catch(() => {
                    this.$lastBlockTime.textContent = '0s';
                });
        });
    }

    _showBlockInfo(block) {
        if (!block) {
            this.$blockInfo.style.display = 'none';
            this.$blockNotFound.style.display = 'block';
            return;
        }
        this.$blockInfo.style.display = 'block';
        this.$blockNotFound.style.display = 'none';

        this.$blockHash.textContent = block.hash().toHex();
        this.$blockPrevHash.textContent = block.prevHash.toHex();
        this.$blockAccountsHash.textContent = block.accountsHash.toHex();
        this.$blockTimestamp.textContent = new Date(block.timestamp * 1000).toISOString().replace('T', ' ').slice(0, -5);
        this.$blockNonce.textContent = block.nonce;
        this.$blockTransactionsCount.textContent = !block.isLight()? block.transactionCount : '';

        block.pow().then(pow => {
            const realDifficulty = Krypton.BlockUtils.realDifficulty(pow);
            this.$blockPowHash.textContent = pow.toHex();
            this.$blockDifficulty.textContent = `${block.difficulty} (${realDifficulty})`;
        });

        if (!this._blockInterlinkCollapsed) {
            const interlink = `<hash>${block.interlink.hashes.map((it, i) => i + ':' + it.toHex()).join('</hash><br><hash>')}</hash>`;
            this.$blockInterlink.innerHTML = interlink;
        }

        if (!this._blockTransactionsCollapsed) {
            this._updateBlocktransactions(block);
        }
    }

    _updateBlocktransactions(block) {
        if (block.isLight()) {
            this.$blockTransactions.textContent = 'No transaction info available for light block.';
            return;
        }
        if (block.transactions.length === 0) {
            this.$blockTransactions.textContent = 'No transactions.';
            return;
        }

        const transactions = block.transactions.map(tx => {
            const value = Utils.satoshisToCoins(tx.value);
            const fee = Utils.satoshisToCoins(tx.fee);
            return `<div>&nbsp;-&gt; from=${tx.sender.toUserFriendlyAddress()}, to=${tx.recipient.toUserFriendlyAddress()}, value=${value}, fee=${fee}, validityStart=${tx.validityStartHeight}</div>`;
        });

        this.$blockTransactions.innerHTML = transactions.join('');
    }

    _updateUserRequestedBlock() {
        if (this.$blockHeightInput.value === '') {
            this.$.client.getHeadBlock().then((head) => this._showBlockInfo(head));
            return;
        }
        const blockHeight = parseInt(this.$blockHeightInput.value);
        this.$.client.getBlockAt(blockHeight).then(block => {
            if (parseInt(this.$blockHeightInput.value) !== blockHeight) return; // user changed value again
            this._showBlockInfo(block);
        });
    }

    _toggleBlockInterlink() {
        if (this._blockInterlinkCollapsed) {
            this._blockInterlinkCollapsed = false;
            this.$blockInterlink.parentNode.classList.remove('collapsed');
            this._updateUserRequestedBlock();
        } else {
            this._blockInterlinkCollapsed = true;
            this.$blockInterlink.parentNode.classList.add('collapsed');
        }
    }

    _toggleTransactions() {
        if (this._blockTransactionsCollapsed) {
            this._blockTransactionsCollapsed = false;
            this.$blockTransactions.parentNode.classList.remove('collapsed');
            this._updateUserRequestedBlock();
        } else {
            this._blockTransactionsCollapsed = true;
            this.$blockTransactions.parentNode.classList.add('collapsed');
        }
    }
}
