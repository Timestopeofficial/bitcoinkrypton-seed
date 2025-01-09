# Krypton Blockchain

Krypton is a frictionless payment protocol for the web.

## Resources

- [Node.js Client Documentation](doc/nodejs-client.md): Usage and configuration documentation for the Krypton Node.js Client.
- [JSON-RPC Client Documentation](doc/json-rpc-client.md): Usage instructions for the Krypton JSON-RPC Client.
- [Docker Documentation](doc/docker.md): Instuctions on setting up a Krypton Node using Docker.

## Packages

### NPM Packages
For developers looking to include Krypton support on their applications, there are two npm packages available:

- [`@timestope-official/bitcoinkrypton-seed`](https://www.npmjs.com/package/@timestope-official/bitcoinkrypton-seed): Module for use in node.js applications.
- [`@timestope-official/bitcoinkrypton-browser`](https://www.npmjs.com/package/@timestope-official/bitcoinkrypton-browser): Module for use in client-side (browser) applications

## Web Developers

### Getting Started

Import `Krypton` as an ES6 module:

```javascript
// With a package.json-aware module loader:
import Krypton from '@timestope-official/bitcoinkrypton-browser';

// Otherwise:
import Krypton from 'node_modules/@timestope-official/bitcoinkrypton-browser/web.esm.js';
```

To use Krypton's cryptographic functions (for hashing, signing, derivation),
you have to make the following files from this package available to the browser
(for e.g. Vue, this means copying them into the `public` folder, or getting them
otherwise into the output directory):

```text
worker.js
worker-js.js
worker-wasm.js
worker-wasm.wasm
```

You can then load the Krypton worker by calling `Krypton.load()` with the URL of the folder containing the files:

```javascript
// Important: must be a full URL, a trailing slash is required.
const workerURL = location.origin + '/assets/krypton/';

Krypton.load(workerURL).then(async function() {
    // All Krypton functionality is available here.
});
```

### Using a regular &lt;script&gt; tag

Include the `krypton.js` file from this package into your project:

```html
<script src="node_modules/@timestope-official/bitcoinkrypton-browser/krypton.js"></script>
```

If you do not need networking support, you can also use the smaller offline build:

```javascript
Krypton.loadOffline().then(...);
```

## License

This project is under the [Apache License 2.0](./LICENSE.md).
