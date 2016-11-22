const fs = require('fs');
const readline = require('readline');
const torControl = require('tor-control');
const spawn = require('child_process').spawn;

const TORPROXY = '127.0.0.1:9050';

var torControl = new TorControl({
    password: 'torpassword',
    persistent: false
});

// Read master list of .onion from file
export.readOnions = function(file, callback) {
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
export.addOnion = function(file, onionArray, callback) {
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

// Using the tor control port to renew identity (if the circuit timeout)
export.getNewTorIdentity = function(callback) {
    torControl.signalNewnym(function(err, status) {
        if (err) {
            return console.error(err);
        }
        console.log('[**] Switched to a new TOR identity');
        callback();
    });
};

// Launch Onionscan in a child process
export.scanDomain = function(url, callback) {
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

export.killScanner = function(){
    onionScanner.kill();
};
