/**********************************
 ************** INIT **************
 **********************************/

const fs = require('fs');
const readline = require('readline');
const spawn = require('child_process').spawn;
const TorControl = require('tor-control');
const socksAgent = require('socks5-http-client/lib/Agent');
const request = require('request');

const TORIP = '127.0.0.1';
const TORPORT = '9050';
const TORPROXY = TORIP + ':' + TORPORT;

var torControl = new TorControl({
    password: 'torpassword',
    persistent: false
});

var urlsToVisit = [];
var urlsVisited = [];
var urlsTimedOut = [];
var onionScanner;


/**********************************
 ****** CRAWLER FUNCTIONS *********
 **********************************/

// Durstenfeld shuffle algorithm
function ShuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
};

// Read master list of .onion from file
function ReadOnions(file, callback) {
    var rd;
    var nbOnions;
    var filelist;
    fs.readdir('./ScanResults/', function(err, files) {
        filelist = files;
        rd = readline.createInterface({
            input: fs.createReadStream(file),
            output: process.stdout,
            terminal: false
        });
        rd.on('line', function(line) {
            if (filelist.indexOf(line + '.json') == -1) {
                nbOnions = urlsToVisit.push(line);
            } else {
                urlsVisited.push(line);
            }
        });
        rd.on('close', function() {
            urlsToVisit = ShuffleArray(urlsToVisit);
            return callback(nbOnions);
        });
    });
};

// Control and append new discovered onions if they aren't already in the master file or in the array urlsToVisit
function AddOnion(file, onionArray, callback) {
    var stringToAppend = '',
        onionsAdded = 0;
    if (onionArray != null) {
        for (var i = 0; i < onionArray.length; i++) {
            if (onionArray[i].endsWith('.onion') && !onionArray[i].startsWith('mailto:') && (urlsToVisit.indexOf(onionArray[i]) == -1 && urlsVisited.indexOf(onionArray[i]) == -1)) {
                urlsToVisit.push(onionArray[i]);
                stringToAppend += onionArray[i] + '\n';
                onionsAdded++;
            }
        }
        if (onionsAdded > 0) {
            fs.open(file, 'a', 0666, function(err, fd) {
                fs.write(fd, stringToAppend, null, 'utf8', function(err, written) {
                    return callback(onionsAdded);
                });
            });
        }
        return callback(0);
    }
    return callback(0);
};

// Launch simple and complete (Onionscan) scan for an onion domain depending of process.argv
function ScanDomain(url, callback) {
    var scan = '';
    console.log('\n[->] Scanning ' + url + '\n[*] ' + (urlsToVisit.length - 1) + ' onion(s) restant');
    request.get({
        url: 'http://' + url,
        agentClass: socksAgent,
        agentOptions: {
            socksHost: TORIP,
            socksPort: parseInt(TORPORT)
        }
    }, function(err, res) {
        if (err) {
            return callback('timeout');
        }
        if (process.argv.indexOf('--full') > -1) {
            onionScanner = spawn('onionscan', ['--torProxyAddress', TORPROXY, '--jsonReport', '--webport', '0', url]);
            onionScanner.stdout.on('data', function(data) {
                scan += data.toString();
            });
            onionScanner.on('close', function() {
                return callback(scan, res.body);
            });
        } else {
            return callback(JSON.stringify({
                hiddenService: url,
                snapshot: res.body
            }));
        }
    });
};

// Function to timeout the ScanDomain function if it take too long
function TimeoutFunction(callback, timeout) {
    var run, timer;
    run = function() {
        if (timer) {
            clearTimeout(timer);
            timer = null;
            callback.apply(this, arguments);
        }
    };
    timer = setTimeout(run, timeout, 'timeout');
    return run;
};

// Using the tor control port to renew identity (if the circuit timeout)
function GetNewTorIdentity(callback) {
    torControl.signalNewnym(function(err, status) {
        if (err) {
            return console.error(err);
        }
        console.log('[**] Switched to a new TOR identity');
        callback();
    });
};

// Recursive function to crawl all the onions in urlsToVisit array
function Crawl() {
    if (urlsToVisit.length > 0) {
        ScanDomain(urlsToVisit[0], TimeoutFunction(function(data, snpsht) {
            if (data === 'timeout') {
                console.log('[!!!] Crawler timed out or TOR circuit too slow...');
                try {
                    onionScanner.kill();
                } catch (e) {
                    //console.log(e);
                }
                urlsVisited.push(urlsToVisit[0]);
                urlsTimedOut.push(urlsToVisit[0]);
                urlsToVisit.shift();
                GetNewTorIdentity(function() {
                    Crawl();
                });
            } else {
                if (process.argv.indexOf('--full') > -1) {
                    if (JSON.parse(data).timedOut === true) {
                        console.log('[!!!] Crawler timed out on onionscan report...');
                        urlsTimedOut.push(urlsToVisit[0]);
                    }
                    var onionScanJson = JSON.parse(data);
                    onionScanJson.snapshot = snpsht;
                    data = JSON.stringify(onionScanJson);
                }
                fs.writeFile('./ScanResults/' + urlsToVisit[0] + '.json', data, function(err) {
                    if (err) {
                        return console.log(err);
                    }
                    console.log('[**] Scanfile saved for ' + urlsToVisit[0]);
                    if (process.argv.indexOf('--full') > -1) {
                        AddOnion('urls.txt', onionScanJson.identifierReport.linkedOnions, function(nb) {
                            if (nb != 0) console.log('[*] Added ' + nb + ' .onion linked site(s) to master file');
                        });
                        AddOnion('urls.txt', onionScanJson.identifierReport.relatedOnionDomains, function(nb) {
                            if (nb != 0) console.log('[*] Added ' + nb + ' related .onion domain(s) to master file');
                        });
                        AddOnion('urls.txt', onionScanJson.identifierReport.relatedOnionServices, function(nb) {
                            if (nb != 0) console.log('[*] Added ' + nb + ' related .onion service(s) to master file');
                        });
                    }
                    urlsVisited.push(urlsToVisit[0]);
                    urlsToVisit.shift();
                    GetNewTorIdentity(function() {
                        Crawl();
                    });
                });
            }
        }, 300000));
    }
};


/**********************************
 ********** MAIN PROGRAMM *********
 **********************************/

// Crawler
ReadOnions('urls.txt', function(nbOnions) {
    console.log('\nTOTAL ONIONS IN MASTER FILE : ' + nbOnions);
    GetNewTorIdentity(function() {
        Crawl();
    });
});
