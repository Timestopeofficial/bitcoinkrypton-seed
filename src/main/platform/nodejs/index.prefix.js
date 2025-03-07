module.exports = {};
const atob = require('atob');
const btoa = require('btoa');
const JDB = require('@nimiq/jungle-db');
const fs = require('fs');
const https = require('https');
const http = require('http');
const tls = require('tls');
let cpuid;
try {
    cpuid = require('cpuid-git');
} catch (e) {}
const chalk = require('chalk');

// Allow the user to specify the WebSocket engine through an environment variable. Default to ws
const WebSocket = require(process.env.KRYPTON_WS_ENGINE || 'ws');

global.Class = {
    scope: module.exports,
    register: clazz => {
        module.exports[clazz.prototype.constructor.name] = clazz;
    }
};

// Always try to use the node.js addon that was compiled locally (as it is
// optimized specifically to this CPU), if that fails (i.e. this instance
// was not compiled from source code), use one of the generic addons
function detectAddOn() {
    let NodeNativeTry;
    let cpuSupport = 'native';
    try {
        NodeNativeTry = require('bindings')(`krypton_node_${cpuSupport}.node`);
    } catch (e) {
        cpuSupport = undefined;
    }

    // Use CPUID to get the available processor extensions
    // and choose the right version of the node.js addon
    cpuSupport = cpuSupport || function() {
        try {
            const cpu = cpuid();
            return ['avx512f', 'avx2', 'avx', 'sse2'].find(f => cpu.features[f]) || 'compat';
        } catch (e) {
            return 'compat';
        }
    }();

    let NodeNative = NodeNativeTry || require('bindings')(`krypton_node_${cpuSupport}.node`);

    return {NodeNative, cpuSupport};
}

const {NodeNative, cpuSupport} = detectAddOn();
