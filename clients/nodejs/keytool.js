let Krypton;
try {
    Krypton = require('../../dist/node.js');
} catch (e) {
    Krypton = require('@timestope-official/bitcoinkrypton-seed');
}
const readline = require('readline');
const argv = require('minimist')(process.argv.slice(2));

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
});

async function list() {
    const walletStore = await new Krypton.WalletStore();
    const addresses = await walletStore.list();
    const def = (await walletStore.getDefault()).address;
    for (const addr of addresses) {
        if (addr.equals(def)) {
            console.log(addr.toUserFriendlyAddress() + ' *');
        } else {
            console.log(addr.toUserFriendlyAddress());
        }
    }
    await walletStore.close();
}

async function _import(type, format) {
    let entropy;
    switch (format) {
        case 'words': {
            const words = await new Promise((resolve) => {
                rl.question('Enter 24-word phrase: ', resolve);
            });
            if (words.split(' ').length !== 24) {
                throw new Error('Invalid number of words.');
            }
            const mnemonicType = Krypton.MnemonicUtils.getMnemonicType(words);
            if (type === 'auto') {
                switch (mnemonicType) {
                    case Krypton.MnemonicUtils.MnemonicType.LEGACY:
                        type = 'legacy';
                        break;
                    case Krypton.MnemonicUtils.MnemonicType.BIP39:
                        type = 'bip39';
                        break;
                    default:
                        throw new Error('Unable to auto-discover private key type. Specify through --type option.');
                }
            }
            if (type === 'legacy') {
                if (mnemonicType !== Krypton.MnemonicUtils.MnemonicType.LEGACY) {
                    throw new Error('24-word phrase is not of specified type.');
                }
                entropy = Krypton.MnemonicUtils.legacyMnemonicToEntropy(words);
            } else if (type === 'bip39') {
                if (mnemonicType !== Krypton.MnemonicUtils.MnemonicType.BIP39) {
                    throw new Error('24-word phrase is not of specified type.');
                }
                entropy = Krypton.MnemonicUtils.mnemonicToEntropy(words);
            } else {
                throw new Error('24-word phrase is not of specified type.');
            }
            break;
        }
        case 'hex': {
            if (type === 'auto') throw new Error('Unable to auto-discover private key type with hex encoding. Specify through --type option.');
            const hex = await new Promise((resolve) => {
                rl.question('Enter private key as hex: ', resolve);
            });
            entropy = new Krypton.Entropy(Krypton.BufferUtils.fromHex(hex));
            break;
        }
        case 'base64': {
            if (type === 'auto') throw new Error('Unable to auto-discover private key type with base64 encoding. Specify through --type option.');
            const hex = await new Promise((resolve) => {
                rl.question('Enter private key as base64: ', resolve);
            });
            entropy = new Krypton.Entropy(Krypton.BufferUtils.fromBase64(hex));
            break;
        }
    }
    switch (type) {
        case 'legacy': {
            const privateKey = new Krypton.PrivateKey(entropy.serialize());
            const keyPair = Krypton.KeyPair.derive(privateKey);
            const wallet = new Krypton.Wallet(keyPair);
            const walletStore = await new Krypton.WalletStore();
            await walletStore.put(wallet);
            await walletStore.close();
            console.log('Imported wallet for address:', wallet.address.toUserFriendlyAddress());
            break;
        }
        case 'bip39': {
            const masterKey = entropy.toExtendedPrivateKey();
            const privateKey = masterKey.derivePath("m/44'/60'/0'/0'").privateKey;
            const keyPair = Krypton.KeyPair.derive(privateKey);
            const wallet = new Krypton.Wallet(keyPair);
            const walletStore = await new Krypton.WalletStore();
            await walletStore.put(wallet);
            await walletStore.close();
            console.log('Imported wallet for address:', wallet.address.toUserFriendlyAddress());
            break;
        }
        default: {
            throw new Error('Unknown key type');
        }
    }
}

async function _export(address, format) {
    const walletStore = await new Krypton.WalletStore();
    let wallet;
    if (!address) {
        wallet = await walletStore.getDefault();
    } else {
        wallet = await walletStore.get(Krypton.Address.fromString(address));
    }
    await walletStore.close();
    const privateKey = wallet.keyPair.privateKey;
    switch (format) {
        case 'words':
            console.log(Krypton.MnemonicUtils.entropyToLegacyMnemonic(privateKey.serialize()).reduce((a, b) => a ? a + ' ' + b : b));
            break;
        case 'hex':
            console.log(privateKey.toHex());
            break;
        case 'base64':
            console.log(privateKey.toBase64());
            break;
    }
}

async function remove(address) {
    if (!address) throw new Error('Specify new default address via --address');
    const walletStore = await new Krypton.WalletStore();
    const nimAddress = Krypton.Address.fromString(address);
    const def = await walletStore.getDefault();
    await walletStore.remove(nimAddress);
    console.log('Removed address:', Krypton.Address.fromString(address).toUserFriendlyAddress());
    if (nimAddress.equals(def.address)) {
        const list = await walletStore.list();
        await walletStore.setDefault(list[0]);
        console.log('Set default to address:', list[0].toUserFriendlyAddress());
    }
    await walletStore.close();
}

async function setDefault(address) {
    if (!address) throw new Error('Specify new default address via --address');
    const walletStore = await new Krypton.WalletStore();
    await walletStore.setDefault(Krypton.Address.fromString(address));
    await walletStore.close();
    console.log('Set default to address:', Krypton.Address.fromString(address).toUserFriendlyAddress());
}

function help() {
    console.log(`Krypton NodeJS Client Key Management Tool

Usage:
    node keytool.js <command> [options]

Commands:
    list                List addresses managed in this client. Default is tagged with asterisk
    set-default         Set the client default address. Use together with --address
    import              Import new addresses to this client
    export              Export private key from this client

Options:
    --address ADDRESS   Address to export. Defaults to the client default.
    --format FORMAT     Format of key for import or export
                        Possible values: words (default), hex, base64
    --type TYPE         Type of key for import.
                        Possible values: auto (default), legacy
    --help              Display this help page
    `);
    rl.close();
}

(async () => {
    if (argv.help) {
        return help();
    }

    argv.type = argv.type || 'auto';
    if (!['auto', 'legacy'].includes(argv.type)) {
        console.error('Invalid type:', argv.type);
        return help();
    }
    argv.format = argv.format || 'words';
    if (!['words', 'hex', 'base64', 'legacy'].includes(argv.format)) {
        console.error('Invalid format:', argv.format);
        return help();
    }

    try {
        switch (argv._[0]) {
            case 'list':
                await list();
                break;
            case 'import':
                await _import(argv.type, argv.format);
                break;
            case 'export':
                await _export(argv.address, argv.format);
                break;
            case 'remove':
                await remove(argv.address);
                break;
            case 'set-default':
                await setDefault(argv.address);
                break;
            default:
                help();
                break;
        }
        rl.close();
    } catch (e) {
        console.error(e.message || e.msg || e);
        rl.close();
    }
})();
