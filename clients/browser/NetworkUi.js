class NetworkUi {
    constructor(el, $) {
        this.$el = el;
        this.$ = $;

        this.$networkTitle = this.$el.querySelector('[network-title]');
        this.$networkTitle.addEventListener('click', () => this._toggleTitle());

        this.$peerAddress = this.$el.querySelector('[peer-address]');
        this.$peerCount = this.$el.querySelector('[peer-count]');
        this.$peerCountWs = this.$el.querySelector('[peer-count-ws]');
        this.$peerCountWss = this.$el.querySelector('[peer-count-wss]');
        this.$peerCountRtc = this.$el.querySelector('[peer-count-rtc]');
        this.$bytesReceived = this.$el.querySelector('[bytes-received]');
        this.$bytesSent = this.$el.querySelector('[bytes-sent]');

        $.client.network.getOwnAddress().then(address => {
            this.$peerAddress.textContent = address.peerAddress.toString();
        });
        // TODO: Listen for live updates of peer data once supported by client API
        setInterval(() => this._networkChanged(), 2500);

        this._networkChanged();
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
    
    _networkChanged() {
        this.$.client.network.getStatistics().then(/** @type {Client.NetworkStatistics} */ stats => {
            this.$peerCount.textContent = stats.totalPeerCount;
            this.$peerCountWs.textContent = stats.peerCountsByType['ws'];
            this.$peerCountWss.textContent = stats.peerCountsByType['wss'];
            this.$peerCountRtc.textContent = stats.peerCountsByType['rtc'];
            this.$bytesReceived.textContent = Utils.humanBytes(stats.bytesReceived);
            this.$bytesSent.textContent = Utils.humanBytes(stats.bytesSent);
        });
    }
}
