if (typeof Krypton === 'undefined') {
    var Krypton = typeof window !== 'undefined' ? window : {};
}
var Proxy; // ensure Proxy exists
(function (exports) {
    exports = typeof exports !== 'undefined' ? exports : {};
    Krypton = exports;
    if (!Krypton._currentScript) {
        Krypton._currentScript = document.currentScript;
    }
    if (!Krypton._currentScript) {
        // Heuristic
        const scripts = document.getElementsByTagName('script');
        Krypton._currentScript = scripts[scripts.length - 1];
    }
    if (!Krypton._path) {
        if (Krypton._currentScript && Krypton._currentScript.src.indexOf('/') !== -1) {
            Krypton._path = Krypton._currentScript.src.substring(0, Krypton._currentScript.src.lastIndexOf('/') + 1);
        } else {
            // Fallback
            Krypton._path = './';
        }
    }
