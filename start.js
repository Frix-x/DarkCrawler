/**********************************
 ************** INIT **************
 **********************************/

const fs = require('fs');
const readline = require('readline');
const spawn = require('child_process').spawn;
const TorControl = require('tor-control');
const request = require('request');

const TORPROXY = '127.0.0.1:9050';
const GEPHISRV = 'http://127.0.0.1:8080/workspace1';

var torControl = new TorControl({
    password: 'torpassword',
    persistent: false
});

var urlsToVisit = [];
var urlsVisited = [];
var urlsTimedOut = [];
var onionScanner;


/**********************************
 ******** GRAPHER FUNCTIONS *******
 **********************************/

// Helper to send node info to Gephi
function AddGephiNode(node, type, callback) {
    var jsonToSend = '{"an":{"' + node + '":{"service_type": "' + type + '","size":10,"Label":"' + node + '"}}}';
    var options = {
        uri: GEPHISRV + '?operation=updateGraph',
        method: 'POST',
        json: JSON.parse(jsonToSend)
    };
    request(options, function(error, response, body) {
        if (!error) {
            return callback(node);
        } else {
            console.log('[!!!] Gephi link broken...');
            return;
        }
    });
}

// Helper to send edge info to Gephi
function AddGephiEdge(node1, node2, callback) {
    var jsonToSend = '{"ae":{"' + node1 + '_' + node2 + '":{"source":"' + node1 + '","target":"' + node2 + '","directed":false}}}';
    var options = {
        uri: GEPHISRV + '?operation=updateGraph',
        method: 'POST',
        json: JSON.parse(jsonToSend)
    };
    request(options, function(error, response, body) {
        if (!error) {
            return callback();
        } else {
            console.log('[!!!] Gephi link broken...');
            return;
        }
    });
}

// Process scan data with logic to put nodes and edges on a Gephi graph
function MkGephiGraph(scandata) {
    var sitesArray = [
            scandata.linkedSites,
            scandata.relatedOnionDomains,
            scandata.relatedOnionServices
        ],
        onion = scandata.hiddenService;
    AddGephiNode(onion, 'hiddenService', function() {
        for (var i = 0; i < 3; i++) {
            if (sitesArray[i] != null) {
                for (var j = 0; j < sitesArray[i].length; j++) {
                    if (sitesArray[i][j].endsWith('.onion')) {
                        AddGephiNode(sitesArray[i][j], 'hiddenService', function(addedNode) {
                            AddGephiEdge(onion, addedNode, function() {
                                //console.log('edge added ' + addedNode);
                            });
                        });
                    } else {
                        AddGephiNode(sitesArray[i][j], 'clearNet', function(addedNode) {
                            AddGephiEdge(onion, addedNode, function() {
                                //console.log('edge added ' + addedNode);
                            });
                        });
                    }
                }
            }
        }
    });
}


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
    var rd = readline.createInterface({
        input: fs.createReadStream(file),
        output: process.stdout,
        terminal: false
    });
    var nbOnions;
    rd.on('line', function(line) {
        nbOnions = urlsToVisit.push(line);
    });
    rd.on('close', function() {
        urlsToVisit = ShuffleArray(urlsToVisit);
        return callback(nbOnions);
    });
};

// Control and append new discovered onions if they aren't already in the master file or in the array urlsToVisit
function AddOnion(file, onionArray, callback) {
    var stringToAppend = '',
        onionsAdded = 0;
    if (onionArray != null) {
        for (var i = 0; i < onionArray.length; i++) {
            if (onionArray[i].endsWith('.onion') && (urlsToVisit.indexOf(onionArray[i]) == -1 && urlsVisited.indexOf(onionArray[i]) == -1)) {
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

// Launch Onionscan in a child process (need to add the casperJS part for semantic analysis)
function ScanDomain(url, callback) {
    var scan = '';
    console.log('\n[->] Scanning ' + url + '\n[*] ' + (urlsToVisit.length - 1) + ' onion(s) restant');
    onionScanner = spawn('onionscan', ['--torProxyAddress', TORPROXY, '--jsonReport', url]);
    onionScanner.stdout.setEncoding('utf8');
    onionScanner.stdout.on('data', function(data) {
        scan += data.toString();
    });
    onionScanner.stdout.on('end', function() {
        return callback(scan);
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

// First stage of processing scans data
function ProcessResults(onion, onionScan, casperScan, callback) {
    fs.writeFile('./ScanResults/' + onion + '.json', onionScan, function(err) {
        if (err) {
            return console.log(err);
        }
        console.log('[**] Scanfile saved for ' + onion);
        var onionScanJson = JSON.parse(onionScan);
        AddOnion('urls.txt', onionScanJson.linkedSites, function(nb) {
            if (nb != 0) console.log('[*] Added ' + nb + ' .onion linked site(s) to master file');
        });
        AddOnion('urls.txt', onionScanJson.relatedOnionDomains, function(nb) {
            if (nb != 0) console.log('[*] Added ' + nb + ' related .onion domain(s) to master file');
        });
        AddOnion('urls.txt', onionScanJson.relatedOnionServices, function(nb) {
            if (nb != 0) console.log('[*] Added ' + nb + ' related .onion service(s) to master file');
        });
        MkGephiGraph(onionScanJson);
        return callback();
    });
};

// Recursive function to crawl all the onions in urlsToVisit array
function Crawl() {
    if (urlsToVisit.length > 0) {
        ScanDomain(urlsToVisit[0], TimeoutFunction(function(data) {
            if (data === 'timeout') {
                console.log('[!!!] Crawler timed out : circuit too slow on this domain...');
                onionScanner.kill();
                urlsToVisit = ShuffleArray(urlsToVisit);
                GetNewTorIdentity(function() {
                    Crawl();
                });
            } else if (JSON.parse(data).TimedOut === true) {
                console.log('[!!!] Crawler timed out : onion not responding...');
                urlsVisited.push(urlsToVisit[0]);
                urlsTimedOut.push(urlsToVisit[0]);
                urlsToVisit.shift();
                GetNewTorIdentity(function() {
                    Crawl();
                });
            } else {
                ProcessResults(urlsToVisit[0], data, null, function() {
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
