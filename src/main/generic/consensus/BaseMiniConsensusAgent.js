/**
 * @abstract
 */
class BaseMiniConsensusAgent extends BaseConsensusAgent {
    /**
     * @param {BaseChain} blockchain
     * @param {NanoMempool} mempool
     * @param {Time} time
     * @param {Peer} peer
     * @param {InvRequestManager} invRequestManager
     * @param {Subscription} [targetSubscription]
     */
    constructor(blockchain, mempool, time, peer, invRequestManager, targetSubscription) {
        super(time, peer, invRequestManager, targetSubscription);

        /** @type {BaseChain} */
        this._blockchain = blockchain;
        /** @type {NanoMempool} */
        this._mempool = mempool;

        this._subscribeTarget();

        // Helper object to keep track of the accounts we're requesting from the peer.
        this._accountsRequest = null;
        this._onToDisconnect(peer.channel, 'accounts-proof', msg => this._onAccountsProof(msg));
    }

    requestMempool() {
        // Request the peer's mempool.
        // XXX Use a random delay here to prevent requests to multiple peers at once.
        const delay = BaseMiniConsensusAgent.MEMPOOL_DELAY_MIN
            + Math.random() * (BaseMiniConsensusAgent.MEMPOOL_DELAY_MAX - BaseMiniConsensusAgent.MEMPOOL_DELAY_MIN);
        setTimeout(() => this._peer.channel.mempool(), delay);
    }


    /**
     * @param {Hash} blockHash
     * @param {Array.<Address>} addresses
     * @returns {Promise.<Array.<Account>>}
     */
    getAccounts(blockHash, addresses) {
        return this._synchronizer.push('getAccounts',
            this._getAccounts.bind(this, blockHash, addresses));
    }

    /**
     * @param {Hash} blockHash
     * @param {Array.<Address>} addresses
     * @returns {Promise.<Array<Account>>}
     * @private
     */
    async _getAccounts(blockHash, addresses) {
        Assert.that(this._accountsRequest === null);

        const block = await this._blockchain.getBlock(blockHash);
        if (!block) {
            throw new Error('Unknown block hash');
        }

        Log.d(BaseMiniConsensusAgent, `Requesting AccountsProof for ${addresses} from ${this._peer.peerAddress}`);

        return new Promise((resolve, reject) => {
            this._accountsRequest = {
                addresses,
                block,
                resolve,
                reject
            };

            // Request AccountsProof from peer.
            this._peer.channel.getAccountsProof(blockHash, addresses);

            // Drop the peer if it doesn't send the accounts proof within the timeout.
            this._peer.channel.expectMessage(Message.Type.ACCOUNTS_PROOF, () => {
                this._peer.channel.close(CloseType.GET_ACCOUNTS_PROOF_TIMEOUT, 'getAccountsProof timeout');
                reject(new Error('Timeout'));
            }, BaseMiniConsensusAgent.ACCOUNTSPROOF_REQUEST_TIMEOUT);
        });
    }

    /**
     * @param {AccountsProofMessage} msg
     * @returns {Promise.<void>}
     * @private
     */
    async _onAccountsProof(msg) {
        Log.d(BaseMiniConsensusAgent, `[ACCOUNTS-PROOF] Received from ${this._peer.peerAddress}: blockHash=${msg.blockHash}, proof=${msg.proof} (${msg.serializedSize} bytes)`);

        // Check if we have requested an accounts proof, discard unsolicited ones.
        if (!this._accountsRequest) {
            Log.w(BaseMiniConsensusAgent, `Unsolicited accounts proof received from ${this._peer.peerAddress}`);
            return;
        }

        // Reset accountsRequest.
        const {addresses, /** @type {Block} */ block, resolve, reject} = this._accountsRequest;
        this._accountsRequest = null;

        if (!msg.hasProof()) {
            reject(new Error('Accounts request was rejected'));
            return;
        }

        // Check that the reference block corresponds to the one we requested.
        const blockHash = block.hash();
        if (!blockHash.equals(msg.blockHash)) {
            Log.w(BaseMiniConsensusAgent, `Received AccountsProof for invalid reference block from ${this._peer.peerAddress}`);
            reject(new Error('Invalid reference block'));
            return;
        }

        // Verify the proof.
        const proof = msg.proof;
        if (!proof.verify()) {
            Log.w(BaseMiniConsensusAgent, `Invalid AccountsProof received from ${this._peer.peerAddress}`);
            this._peer.channel.close(CloseType.INVALID_ACCOUNTS_PROOF, 'Invalid AccountsProof');
            reject(new Error('Invalid AccountsProof'));
            return;
        }

        // Check that the proof root hash matches the accountsHash in the reference block.
        const rootHash = proof.root();
        if (!block.accountsHash.equals(rootHash)) {
            Log.w(BaseMiniConsensusAgent, `Invalid AccountsProof (root hash) received from ${this._peer.peerAddress}`);
            this._peer.channel.close(CloseType.INVALID_ACCOUNTS_PROOF, 'AccountsProof root hash mismatch');
            reject(new Error('AccountsProof root hash mismatch'));
            return;
        }

        // Check that all requested accounts are part of this proof.
        // XXX return a map address -> account instead?
        const accounts = [];
        for (const address of addresses) {
            try {
                const account = proof.getAccount(address);
                accounts.push(account);
            } catch (e) {
                Log.w(BaseMiniConsensusAgent, `Incomplete AccountsProof received from ${this._peer.peerAddress}`);
                this._peer.channel.close(CloseType.INVALID_ACCOUNTS_PROOF, 'Incomplete AccountsProof');
                reject(new Error('Incomplete AccountsProof'));
                return;
            }
        }

        // Return the retrieved accounts.
        resolve(accounts);
    }

    /**
     * @returns {Iterable.<Transaction>}
     * @protected
     * @override
     */
    _getSubscribedMempoolTransactions() {
        switch (this._remoteSubscription.type) {
            case Subscription.Type.ADDRESSES:
                return this._mempool.getTransactionsByAddresses(this._remoteSubscription.addresses, BaseMiniConsensusAgent.MEMPOOL_ENTRIES_MAX);
            case Subscription.Type.ANY:
                return this._mempool.getTransactions(BaseMiniConsensusAgent.MEMPOOL_ENTRIES_MAX);
        }
        return [];
    }
}
/**
 * Maximum time (ms) to wait for accounts-proof after sending out get-accounts-proof before dropping the peer.
 * @type {number}
 */
BaseMiniConsensusAgent.ACCOUNTSPROOF_REQUEST_TIMEOUT = 1000 * 5;
/**
 * Minimum time {ms} to wait before triggering the initial mempool request.
 * @type {number}
 */
BaseMiniConsensusAgent.MEMPOOL_DELAY_MIN = 500; // 0.5 seconds
/**
 * Maximum time {ms} to wait before triggering the initial mempool request.
 * @type {number}
 */
BaseMiniConsensusAgent.MEMPOOL_DELAY_MAX = 1000 * 5; // 5 seconds
/**
 * Number of transaction vectors to send
 * @type {number}
 */
BaseMiniConsensusAgent.MEMPOOL_ENTRIES_MAX = 1000;
Class.register(BaseMiniConsensusAgent);
