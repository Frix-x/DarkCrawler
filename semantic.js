/**********************************
 ************** INIT **************
 **********************************/

const GEPHISRV = 'http://127.0.0.1:8080/workspace2';

const fs = require('fs');
const request = require('request');
const chokidar = require('chokidar');

/**********************************
 ******** GRAPHER FUNCTIONS *******
 **********************************/

// Helper to send node info to Gephi
function AddGephiNode(node, title, type, callback) {
    var jsonToSend = '{"an":{"' + node + '":{"service_type": "' + type + '","size":10,"Label":"' + title + '"}}}';
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
            // SEMANTIC ANALYSIS HERE
        }
    });
});
