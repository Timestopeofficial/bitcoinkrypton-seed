/**
 * Entry class and dynamic loader for the Krypton library in Browsers.
 *
 * When using NodeJS, you don't need this class. Just require the `krypton` library.
 *
 * @example <caption>Browser usage</caption>
 * <script type="text/javascript" src="https://cdn.krypton.com/core/krypton.js></script>
 * <script type="text/javascript">
 *     Krypton.init(function(core) {
 *         console.log(core.wallet.address);
 *     }, function(errorCode) {
 *         console.log("Error initializing core.");
 *     }, options)
 * </script>
 *
 * @example <caption>Browser usage (experimental)</caption>
 * <script type="text/javascript" src="https://cdn.krypton.com/core/krypton.js></script>
 * <script type="text/javascript">
 *     async function init() {
 *         await Krypton.load();
 *         const core = await new Krypton.Core(options);
 *         console.log(core.wallet.address);
 *     }
 *     init();
 * </script>
 *
 * @example <caption>NodeJS usage</caption>
 * const Krypton = require('krypton');
 * const core = await new Krypton.Core(options);
 * console.log(core.wallet.address);
 *
 * @namespace
 */
class Krypton {
    /**
     * Load the Krypton library.
     * @param {?string} [path] Path that contains the required files to load the library.
     * @returns {Promise} Promise that resolves once the library was loaded.
     */
    static load(path) {
        return Krypton._load(path, 'web');
    }

    /**
     * Load the reduced offline version of the Krypton library.
     * @param {?string} [path] Path that contains the required files to load the library.
     * @returns {Promise} Promise that resolves once the library was loaded.
     */
    static loadOffline(path) {
        return Krypton._load(path, 'web-offline');
    }

    static _load(path, script) {
        if (!Krypton._hasNativePromise()) return Krypton._unsupportedPromise();
        if (Krypton._loaded) return Promise.resolve();
        Krypton._loadPromise = Krypton._loadPromise ||
            new Promise((resolve, error) => {
                if (!Krypton._script) {
                    if (!Krypton._hasNativeClassSupport() || !Krypton._hasProperScoping()) {
                        console.error('Unsupported browser');
                        error(Krypton.ERR_UNSUPPORTED);
                        return;
                    } else if (!Krypton._hasAsyncAwaitSupport()) {
                        Krypton._script = `${script}-babel.js`;
                        console.warn('Client lacks native support for async');
                    } else {
                        Krypton._script = `${script}.js`;
                    }
                }

                if (!path) {
                    if (Krypton._currentScript && Krypton._currentScript.src.indexOf('/') !== -1) {
                        path = Krypton._currentScript.src.substring(0, Krypton._currentScript.src.lastIndexOf('/') + 1);
                    } else {
                        // Fallback
                        path = './';
                    }
                }

                Krypton._path = path;
                Krypton._fullScript = Krypton._path + Krypton._script;

                Krypton._onload = () => {
                    if (!Krypton._loaded) {
                        error(Krypton.ERR_UNKNOWN);
                    } else {
                        resolve();
                    }
                };
                Krypton._loadScript(Krypton._fullScript);
            }).then(() => new Promise((resolve, reject) =>
                Krypton.WasmHelper.doImportBrowser()
                    .then(resolve)
                    .catch(reject.bind(null, Krypton.ERR_UNKNOWN))
            ));
        return Krypton._loadPromise;
    }

    static _loadScript(url) {
        const head = document.getElementsByTagName('head')[0];
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = url;
        head.appendChild(script);
    }

    /**
     * Load classes into scope (so you don't need to prefix them with `Krypton.`).
     * @param {...string} classes Array of class names to load in global scope
     * @returns {Promise.<void>}
     */
    static loadToScope(...classes) {
        return Krypton.load()
            .then(function () {
                for (const clazz of classes) {
                    self[clazz] = Krypton[clazz];
                }
            });
    }

    static _hasNativeClassSupport() {
        try {
            eval('"use strict"; class A{}'); // eslint-disable-line no-eval
            return true;
        } catch (err) {
            return false;
        }
    }

    static _hasAsyncAwaitSupport() {
        try {
            eval('"use strict"; (async function() { await {}; })()'); // eslint-disable-line no-eval
            return true;
        } catch (err) {
            return false;
        }
    }

    static _hasProperScoping() {
        try {
            eval('"use strict"; class a{ a() { const a = 0; } }'); // eslint-disable-line no-eval
            return true;
        } catch (err) {
            return false;
        }
    }

    static _hasNativePromise() {
        return window.Promise;
    }

    static _unsupportedPromise() {
        return {
            'catch': function (handler) {
                handler(Krypton.ERR_UNSUPPORTED);
                return this;
            },
            'then': function () {
                return this;
            }
        };
    }

    static _hasNativeGoodies() {
        return window.Number && window.Number.isInteger;
    }

    /**
     * Initialize the Krypton client library.
     * @param {function()} ready Function to be called once the library is available.
     * @param {function(errorCode: number)} error Function to be called when the initialization fails.
     */
    static init(ready, error) {
        if (!Krypton._hasNativePromise() || !Krypton._hasNativeGoodies()) {
            if (error) error(Krypton.ERR_UNSUPPORTED);
            return;
        }

        // Wait until there is only a single browser window open for this origin.
        WindowDetector.get().waitForSingleWindow(function () {
            Krypton.load()
                .then(function () {
                    console.log('Krypton engine loaded.');
                    if (ready) ready();
                })
                .catch(function (e) {
                    if (Number.isInteger(e)) {
                        if (error) error(e);
                    } else {
                        console.error('Error while initializing the core', e);
                        if (error) error(Krypton.ERR_UNKNOWN);
                    }
                });
        }, function () {
            if (error) error(Krypton.ERR_WAIT);
        });
    }
}

Krypton._currentScript = document.currentScript;
if (!Krypton._currentScript) {
    // Heuristic
    const scripts = document.getElementsByTagName('script');
    Krypton._currentScript = scripts[scripts.length - 1];
}

Krypton.ERR_WAIT = -1;
Krypton.ERR_UNSUPPORTED = -2;
Krypton.ERR_UNKNOWN = -3;
Krypton._script = null;
Krypton._path = null;
Krypton._fullScript = null;
Krypton._onload = null;
Krypton._loaded = false;
Krypton._loadPromise = null;
