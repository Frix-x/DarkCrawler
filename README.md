# DarkCrawler

Crawl the Dark Web (TOR) and make a realtime network with the Gephi Streaming API.

## Installation

### 1) Node.js

DarkCrawler runs on Node.js. If you do not have it installed yet, refer to its [website](http://nodejs.org/).

### 2) OnionScan

OnionScan is a free and open source tool written in Go for investigating vulnerabilities on the Dark Web. If not yet installed, you'll have to install the Go requirements. The following instructions are from Ryan Frankel’s [post](http://www.hostingadvice.com/how-to/install-golang-on-ubuntu/).

```bash
# Download Go Version Manager
bash < <(curl -s -S -L https://raw.githubusercontent.com/moovweb/gvm/master/binscripts/gvm-installer)
[[ -s "$HOME/.gvm/scripts/gvm" ]] && source "$HOME/.gvm/scripts/gvm"
source /root/.gvm/scripts/gvm

# Install Go 1.4
gvm install go1.4 --binary
gvm use go1.4
```

For other distributions, please refer to the [GVM repository](https://github.com/moovweb/gvm).

Now it's time to install OnionScan by entering the following :

```bash
go get github.com/s-rah/onionscan
go install github.com/s-rah/onionscan

# OnionScan should be working now with
onionscan
```

### 3) TOR

TOR is a free software for enabling anonymous communication over internet. It's one of the most famous program which let us access one the multiple Dark Web : .onion websites. The name is derived from an acronym for the original software project name "The Onion Router".

We will need a working TOR installation :

```bash
apt-get update
apt-get install tor
```

And a working configuration of the TOR control port :

```bash
# Make a hashed control password
tor --hash-password CHOOSE_A_PASSWORD

# you will get a hash to copy and put in the torrc
nano -w /etc/tor/torrc
```

Then copy and paste at the end of the file :

```bash
ControlPort 9051
ControlListenAddress 127.0.0.1
HashedControlPassword HERE_PUT_THE_GENERATED_HASH
```

### 4) Gephi

Gephi is an open-source network analysis and visualization software package written in Java on the NetBeans platform.
Installation of Gephi is optional but if you want the network, you'll have to install it and it's Streaming API. Please refer to it's [website](https://gephi.org/).

### 5) Application

```bash
# Clone the app
git clone git@github.com:Frix-x/DarkCrawler.git

# Install its dependencies
npm install
```

Don't forget to put a file called urls.txt in the same folder containing the set of urls in .onion to be seeds for the crawler.

## Usage

First of all, put Gephi in English to allow the streaming API to work. Then start the streaming server.

Then change the parameters in the top of the crawl.js file to have the right torpassword and and the right TOR and Gephi servers IPs

```bash
# Launch the crawler
node start.js
```
