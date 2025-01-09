class Utils {
    static loadScript(scriptSrc) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.addEventListener('load', resolve);
            script.addEventListener('error', reject);
            setTimeout(reject, 10000);
            script.src =scriptSrc;
            document.body.appendChild(script);
        });
    }

    static getAccount($, address) {
        return Utils.awaitConsensus($)
            .then(() => $.client.getAccount(address));
    }

    static broadcastTransaction($, tx) {
        // $.client.sendTransaction(tx);
        // return $.client.sendTransaction(tx).then(result => result.state);
        return $.client.sendTransaction(tx).then(result => result);
    }

    static awaitConsensus($) {
        return $.client.waitForConsensusEstablished();
    }

    static humanBytes(bytes) {
        var i = 0;
        var units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        while (bytes > 1024) {
            bytes /= 1024;
            i++;
        }
        return (Number.isInteger(bytes) ? bytes : bytes.toFixed(2)) + ' ' + units[i];
    }

    static satoshisToCoins(value) {
        return Krypton.Policy.satoshisToCoins(value).toFixed(Math.log10(Krypton.Policy.SATOSHIS_PER_COIN));
    }

    static hash(data, algorithm) {
        switch (algorithm) {
            case Krypton.Hash.Algorithm.BLAKE2B: return Krypton.Hash.computeBlake2b(data);
            case Krypton.Hash.Algorithm.SHA256: return Krypton.Hash.computeSha256(data);
            // case Krypton.Hash.Algorithm.ARGON2D intentionally omitted
            default: throw new Error('Invalid hash algorithm');
        }
    }

    static readAddress(input) {
        try {
            const address =  Krypton.Address.fromUserFriendlyAddress(input.value);
            input.classList.remove('error');
            return address;
        } catch (e) {
            input.classList.add('error');
            return null;
        }
    }

    static readNumber(input) {
        const value = parseFloat(input.value);
        if (isNaN(value)) {
            input.classList.add('error');
            return null;
        } else {
            input.classList.remove('error');
            return value;
        }
    }

    static readBase64(input) {
        try {
            const buffer = Krypton.BufferUtils.fromBase64(input.value);
            input.classList.remove('error');
            return buffer;
        } catch(e) {
            input.classList.add('error');
            return null;
        }
    }

    /** async */
    static isBasicWalletAddress($, address) {
        return $.walletStore.list()
            .then(walletAddresses => walletAddresses.some(walletAddress => address.equals(walletAddress)));
    }

    /** async */
    static isMultiSigWalletAddress($, address) {
        return $.walletStore.listMultiSig()
            .then(walletAddresses => walletAddresses.some(walletAddress => address.equals(walletAddress)));
    }
}
