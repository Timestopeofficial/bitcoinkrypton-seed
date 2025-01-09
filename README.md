# Bitcoin Krypton Blockchain

Bitcoin Krypton was developed to fully fulfill its original purpose of creating a peer-to-peer financial program that can operate without the intervention of a trusted third party, in accordance with the original Bitcoin whitepaper.

## Resources

- [Node.js Client Documentation](doc/nodejs-client.md): Usage and configuration documentation for the Krypton Node.js Client.
- [JSON-RPC Client Documentation](doc/json-rpc-client.md): Usage instructions for the Krypton JSON-RPC Client.
- [Docker Documentation](doc/docker.md): Instructions on setting up a Krypton Node using Docker.
- [Packaging Documentation](doc/linux-packaging.md): Instructions on how to build binary packages for Linux (.deb and/or RPM) from this source code.

## Packages

### NPM Packages
For developers looking to include Krypton support on their applications, there are two npm packages available:

- [`@timestope-official/bitcoinkrypton-seed`](https://www.npmjs.com/package/@timestope-official/bitcoinkrypton-seed): Module for use in node.js applications.
- [`@timestope-official/bitcoinkrypton-browser`](https://www.npmjs.com/package/@timestope-official/bitcoinkrypton-browser): Module for use in client-side (browser) applications

## Quickstart

1. Install [Node.js](https://nodejs.org) >= v18.xx
2. On Ubuntu and Debian, install `git` and `build-essential`: `sudo apt-get install -y git build-essential`.
    - On other Linux systems, install `git`, `python3`, `make`, `gcc` and `gcc-c++`.
    - For MacOS or Windows, [check here for git](https://git-scm.com/downloads) and [here for compilation tools](https://github.com/nodejs/node-gyp#on-mac-os-x).
3. Install `yarn` globally: `sudo npm install -g yarn`.
4. Install `gulp` globally:  `yarn global add gulp`.
5. Clone this repository: `git clone https://github.com/Timestopeofficial/bitcoinkrypton-seed.git`.
6. Build the project: `cd krypton && yarn && yarn build`.
7. Open `clients/browser/index.html` in your browser.

## Installation

#### Recommended Installation Specifications

- `Ubuntu`: 22.04.xx

- `Node.js`: 18.xx

- `Python`: 3.10.xx

#### Installation Guide

- [`Document`](doc/INSTALL.md): For detailed installation guide document, please see here.

## Browser client

Open `clients/browser/index.html` in your browser or include `<script src="dist/krypton.js"></script>` in your project.

## Node.js client

To run a Node.js client you will need a **publicly routable IP**, **Domain**, and **SSL Certificate** (get a free certificate at [letsencrypt.org](https://letsencrypt.org/)). Start the client by running `clients/nodejs/krypton` with the respective [configuration](doc/nodejs-client.md).

## Test and Build

### Run Testsuite
- `yarn test` runs browser and Node.js tests.
- `yarn test-browser` runs the testsuite in your browser only.
- `yarn test-node` runs the testsuite in Node.js only.

### Run ESLint
`yarn lint` runs the ESLint javascript linter.

### Build
Executing `yarn build` concatenates all sources into `dist/{web,web-babel,web-crypto,node}.js`

## License

This project is under the [Apache License 2.0](./LICENSE.md).
