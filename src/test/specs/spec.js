process.chdir('./dist');
process.env.NODE_PATH = '.';
require('module').Module._initPaths();

const Krypton = require(process.env.USE_ISTANBUL ? 'node-istanbul.js' : 'node.js');
for (let i in Krypton) global[i] = Krypton[i];

const JasmineConsoleReporter = require('jasmine-console-reporter');
let reporter;
if (process.env.JASMINE_VERBOSE) {
    reporter = new JasmineConsoleReporter({
        colors: 1,           // (0|false)|(1|true)|2
        cleanStack: 1,       // (0|false)|(1|true)|2|3
        verbosity: {pending: true, disabled: true, specs: true, summary: true},        // (0|false)|1|2|(3|true)|4
        listStyle: 'indent', // "flat"|"indent"
        activity: true
    });
} else {
    reporter = new JasmineConsoleReporter({
        colors: 1,           // (0|false)|(1|true)|2
        cleanStack: 1,       // (0|false)|(1|true)|2|3
        verbosity: {pending: true, disabled: false, specs: false, summary: true},        // (0|false)|1|2|(3|true)|4
        listStyle: 'indent', // "flat"|"indent"
        activity: true
    });
}
// initialize and execute
jasmine.getEnv().clearReporters();
jasmine.getEnv().addReporter(reporter);

Krypton.Log.instance.level = process.env.KRYPTON_LOG ? 2 : 10;
Krypton.Log.instance._native._global_prefix = String.fromCharCode(27) + '[1K\r';

global.Class = {
    scope: global,
    register: clazz => {
        global[clazz.prototype.constructor.name] = clazz;
    }
};

require('./generic/DummyData.spec.js');
require('./generic/TestUtils.spec.js');
require('./generic/consensus/TestBlockchain.spec.js');

// Blob is not defined on Node.js
Class.register(class Blob{});

if (process.env.USE_ISTANBUL) {
    jasmine.getEnv().addReporter(/** @type {Reporter} */ {
        jasmineDone() {
            const istanbul = require('istanbul-api');
            const reporter = istanbul.createReporter(istanbul.config.loadObject({reporting: {dir: '../coverage'}}));
            const map = require('istanbul-lib-coverage').createCoverageMap(__coverage__);
            reporter.addAll(['text', 'lcov', 'html']);
            reporter.write(map);
            const fs = require('fs');
            fs.writeFileSync('../coverage/coverage-jasmine.json', JSON.stringify(__coverage__));
        }
    });
}

if (process.env.MINE_ON_DEMAND) {
    TestBlockchain.MINE_ON_DEMAND = true;

    if (process.env.UV_THREADPOOL_SIZE) {
        TestBlockchain._miningPool.poolSize = parseInt(process.env.UV_THREADPOOL_SIZE);
    }

    console.log(`Mining on demand with pool size ${TestBlockchain._miningPool.poolSize}`);

    jasmine.getEnv().addReporter(/** @type {Reporter} */ {
        jasmineDone() {
            const nonces = TestBlockchain.getNonces();
            const fs = require('fs');
            fs.writeFileSync('../src/test/specs/generic/consensus/TestBlockchainNonces.spec.js', nonces);

            console.log(`Wrote TestBlockchain nonces for ${Object.keys(TestBlockchain.NONCES).length} blocks`);
        }
    });
}
