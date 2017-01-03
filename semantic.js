/**********************************
 ************** INIT **************
 **********************************/

const GEPHISRV = 'http://127.0.0.1:8080/workspace2';

const fs = require('graceful-fs');
const request = require('request');
const chokidar = require('chokidar');
const LanguageDetect = require('languagedetect');
const unfluff = require('unfluff');
const lda = require('lda');

var lngDetector = new LanguageDetect();
var limitedRequest = request.defaults({
    pool: {
        maxSockets: 10
    }
});

/**********************************
 ******** GRAPHER FUNCTIONS *******
 **********************************/

// Helper to send node info to Gephi
function AddGephiNode(node, type, callback) {
    var jsonToSend = '{"an":{"' + node + '":{"size":10,"Label":"' + node + '","node_type":"' + type + '"}}}';
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

// Main function
function onionDataAnalysis(scandata, callback) {
    var onionLang = [];
    onionSnpsht = unfluff(scandata.snapshot);
    if (onionSnpsht.text != '') {
        onionLang = lngDetector.detect(onionSnpsht.text, 1);
    } else if (onionSnpsht.description !== undefined) {
        onionLang = lngDetector.detect(onionSnpsht.description, 1);
    } else if (onionSnpsht.title != '') {
        onionLang = lngDetector.detect(onionSnpsht.title, 1);
    }
    if (onionLang[0] !== undefined) {
        console.log('Language : ' + onionLang[0][0] + ' with a probability of : ' + onionLang[0][1]);
        var fulldoc = onionSnpsht.title.concat('\n' + onionSnpsht.text);
        if (onionSnpsht.description !== undefined) {
            fulldoc.concat('\n' + onionSnpsht.description);
        }
        if (fulldoc != '\n' && fulldoc.split('\n').filter(String) > 5) {
            var documents = fulldoc.split('\n').filter(String);
        } else {
            var documents = fulldoc.match(/[^\.!\?]+[\.!\?]+/g);
        }
        if (onionLang[0][0] === 'english') {
            var onionLDA = lda(documents, 1, 10)
            return callback(scandata.hiddenService, onionLDA);
        } else return callback(scandata.hiddenService, []);
    } else return callback(scandata.hiddenService, []);
}


/**********************************
 ********** MAIN PROGRAMM *********
 **********************************/

chokidar.watch('./ScanResults/', {
    ignored: /[\/\\]\./
}).on('add', function(path, ev) {
    fs.readFile(path, 'utf-8', function(err, content) {
        if (err) {
            throw err;
        }
        if (path.endsWith('.json')) {
            var scandata = JSON.parse(content);
            if (scandata.hasOwnProperty('snapshot')) {
                console.log('\n[*] Parsing data for : ' + scandata.hiddenService);
                onionDataAnalysis(scandata, function(onion, onionLDA) {
                    if (onionLDA.length > 0) {
                        AddGephiNode(onion, 'hiddenService', function() {
                            for (var i in onionLDA) {
                                var row = onionLDA[i];
                                for (var j in row) {
                                    var term = row[j];
                                    AddGephiNode(term.term, 'keyword', function(addedNode) {
                                        AddGephiEdge(onion, addedNode, function() {
                                            //console.log('edge added ' + addedNode);
                                        });
                                    });
                                }
                            }
                        });
                    }
                });
            }
        }
    });
});
