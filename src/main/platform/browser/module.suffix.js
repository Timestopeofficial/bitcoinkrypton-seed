/**
 * @param {string} [path]
 * @returns {Promise<void>}
 */
Krypton.load = function(path) {
    // XXX Workaround: Put Krypton into global scope to enable callback from worker-wasm.js.
    if (typeof window !== 'undefined') window.Krypton = Krypton;
    if (path) Krypton._path = path;
    return Krypton.WasmHelper.doImportBrowser();
};

export default Krypton;
