# Installation

## Recommended Installation Specifications

* **Ubuntu**: 22.04.xx

* **Node.js**: 18.xx

* **Python**: 3.10.xx

## Add and switch user

#### Add user
If you are new to Ubuntu (or Debian), we recommend using the user name `krypton` and the group name `sudo`. Run:
```bash
adduser --ingroup sudo --gecos "" krypton
```

#### Switch user
Switch to `krypton` user. Run:
```bash
su - krypton
```

## update OS
Update Ubuntu (or Debian). Run:
```bash
sudo apt update && sudo apt upgrade -y
```

## Install Framework

#### Node.js

To install `Node.js 18.x` version, Run:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y
```

If you encounter an error while installing `Node.js 18.x`, you will need to reconnect to the server and switch to the `krypton` user. Run:
```bash
su - krypton
```

To check if the `Node.js 18.x` version installation is complete, Run:
```bash
node --version
```

#### python
To check if `python3` is installed, Run:
```bash
sudo python3 --version
```
If `python3` is not installed on the server, Run:
```bash
sudo apt install python3 -y
```

## Install Module

#### build-essential
Install the compilation tool(`build-essential`). Run:
```bash
sudo apt install build-essential -y
```

#### yarn
to Install the `yarn`. Run:
```bash
sudo curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
sudo echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
sudo apt install yarn -y
```

To check if the `yarn` installation is complete, Run:
```bash
yarn --version
```

If your server has `yarn` version as `0.xx+git` or has `cmdtest` installed, Run:
```bash
sudo apt remove cmdtest -y
sudo apt update
sudo apt install yarn -y
```

#### git
To check if `git` is installed, Run:
```bash
sudo git --version
```

If `git` is not installed on the server, Run:
```bash
sudo apt install git -y
```

## Download Source Code
Download the `bitcoin krypton` source code. Run:
```bash
cd /home/krypton && git clone https://github.com/Timestopeofficial/bitcoinkrypton-seed.git
```

## Build
To build the `bitcoin krypton` source code. Run:
```bash
cd bitcoinkrypton-seed && yarn
```

If an ERROR occurs during the build, Run:
```bash
yarn
```

## Add Seed Peer

Open the `sample.conf` file. Run:
```bash
vi /home/krypton/bitcoinkrypton-seed/clients/nodejs/sample.conf
```

Copy all the contents of the link below.
- [`Seed Peers`](../doc/BitcoinKryptonSeedNode_v_0_001_09012025.txt): This is a list of seed peers.

Paste the copied content under the phrase `TODO::`.
```
seedPeers: [
    // Details of additional seed node.
    // - host: the hostname of the websocket server to connect to.
    // - port: the port that the krypton node runs on.
    // - publicKey (optional): the public part of the peer key of this seed node. Should always be set if the node
    //                         is accessed via the internet.
    // - protocol (optional): the protocol to use for connecting to the seed node. Possible values: ws or wss.
    // TODO::
]
```

Open `peer.conf` file. Run:
```bash
vi /home/krypton/bitcoinkrypton-seed/rpc/peer.conf
```

Add your IP or domain to `host`. If your server uses a domain, change the `protocol: "wss"`.
```
host: "",
protocol: "ws",
port: 12011,
```

## ADD Service
Open `krypton.service` file. Run:
```bash
sudo vi /etc/systemd/system/krypton.service
```
Paste the contents below into `krypton.service` file.
```
[Unit]
Description=Krypton daemon
After=network-online.target

[Service]
Type=simple
Restart=always
RestartSec=1
User=krypton
WorkingDirectory=/home/krypton/bitcoinkrypton-seed/rpc
ExecStart=/bin/bash /home/krypton/bitcoinkrypton-seed/rpc/launch.sh
SyslogIdentifier=krypton
StartLimitInterval=0
LimitNOFILE=65536
LimitNPROC=65536

[Install]
WantedBy=multi-user.target
```

To enable the `krypton.service` service, Run:
```bash
sudo systemctl enable krypton.service
```

To start the `krypton.service` service, Run:
```bash
sudo systemctl start krypton.service
```

To check if my peer is working properly, Run:
```bash
tail -n 100 -f /home/krypton/bitcoinkrypton-seed/rpc/node.log
```

## Get public key
To get my seed `public key`, Run:
```bash
grep "public key:" /home/krypton/bitcoinkrypton-seed/rpc/node.log
```