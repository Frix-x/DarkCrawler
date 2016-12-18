# DarkCrawler

Crawl the Dark Web (TOR) and make a realtime network with the Gephi Streaming API.

## Installation

### 1) Node.js

DarkCrawler runs on Node.js. If you do not have it installed yet, refer to its [website](http://nodejs.org/).

### 2) OnionScan

[OnionScan](https://github.com/s-rah/onionscan) is a free and open source tool written in Go for investigating vulnerabilities on the Dark Web. If not yet installed, you'll have to install the [Go programming language](https://golang.org/doc/install).

Now it's time to install OnionScan by entering the following :

```bash
go get github.com/s-rah/onionscan
```

Make change to the file in $GOPATH/src/github.com/s-rah/onionscan/deanonymization/get_onion_links.go to add clearNet site to the linkedOnions part of the jsonReport. Then :

```bash
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
git clone https://github.com/Frix-x/DarkCrawler.git

# Install its dependencies
cd DarkCrawler
npm install
```

Don't forget to put a file called urls.txt in the same folder containing the set of urls in .onion to be seeds for the crawler.

## Usage

First of all, put Gephi in English to allow the streaming API to work (while using hyperlink.js or semantic.js) and then start the streaming server.

Then change the parameters in the top of those js files to put the right parameters (torpassword, TOR and Gephi servers IPs)

```bash
# Launch the crawler
node crawl.js
# If a scan was previously lauched and some scan results already present, you can resume it with
node crawl.js --resume

# Launch the hyperlink grapher (can be done in parrallel with crawl.js)
node hyperlink.js

# Launch the semantic grapher (can be done in parrallel with crawl.js)
node semantic.js
```
