if (typeof module !== 'undefined') module.exports = Module;
if (typeof WasmHelper !== 'undefined') WasmHelper.fireModuleLoaded();
else if (typeof Krypton !== 'undefined' && Krypton.WasmHelper) Krypton.WasmHelper.fireModuleLoaded();
