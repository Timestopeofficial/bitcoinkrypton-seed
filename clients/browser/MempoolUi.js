class MempoolUi {
    constructor(el, $) {
        this.$el = el;
        this.$ = $;

        this.$mempoolTitle = this.$el.querySelector('[mempool-title]');
        this.$mempoolTitle.addEventListener('click', () => this._toggleTitle());

        this.$transactionCount = this.$el.querySelector('[transaction-count]');
        this.$transactions = this.$el.querySelector('[transactions]');

        $.client.mempool.addTransactionAddedListener((hash) => this._transactionAdded(hash));
        $.client.mempool.addTransactionRemovedListener((hash) => this._transactionRemoved(hash));

        this._rerenderAll();
    }
    /** @async */
    _toggleTitle() {
        if(window.outerWidth <= 768) {
            const titleParentNode = this.$el.parentNode.getElementsByClassName("info")
            for (let index = 0; index < titleParentNode.length; index++) {
                titleParentNode[index].classList.add('collapsed')
            }
        }

        if (this.$el.classList.contains('collapsed')) this.$el.classList.remove('collapsed');
        else this.$el.classList.add('collapsed');
    }

    _transactionAdded(hash) {
        this.$transactionCount.textContent = (parseInt(this.$transactionCount.textContent) + 1).toString();
        $.client.getTransaction(hash).then(tx => this._addTransaction(tx));
    }

    _transactionRemoved(hash) {
        this.$transactionCount.textContent = (parseInt(this.$transactionCount.textContent) - 1).toString();
        this.$transactions.removeChild(document.getElementById('tx.' + hash.toHex()));
    }

    _rerenderAll() {
        this.$.client.mempool.getTransactions().then((txHashes) => {
            this.$transactionCount.textContent = txHashes.length;

            this.$transactions.innerHTML = '';

            txHashes.forEach(hash => {
                this.$.client.getTransaction(hash).then(tx => this._addTransaction(tx));
            });
        });
    }

    _addTransaction(tx) {
        const el = document.createElement('div');
        el.id = 'tx.' + tx.transactionHash.toHex();
        const value = Utils.satoshisToCoins(tx.value);
        const fee = Utils.satoshisToCoins(tx.fee);
        el.innerHTML = `from=<hash>${tx.sender.toUserFriendlyAddress(false)}</hash>, to=<hash>${tx.recipient.toUserFriendlyAddress(false)}</hash>, value=${value}, fee=${fee}, validityStartHeight=${tx.validityStartHeight}`;
        this.$transactions.appendChild(el);
    }
}
