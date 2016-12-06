/**********************************
 ************** INIT **************
 **********************************/

const GEPHISRV = 'http://127.0.0.1:8080/workspace1';

const fs = require('fs');
const request = require('request');
const chokidar = require('chokidar');


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

// Process scan data with logic to make a graph for hypertext links
function MkHtmlGraph(scandata) {
    var sitesArray = [
            scandata.identifierReport.linkedOnions,
            scandata.identifierReport.relatedOnionDomains,
            scandata.identifierReport.relatedOnionServices
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
                                // This part is currently broken since the new version of onionscan which is not reporting clearNet websites.
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
            MkHtmlGraph(scandata);
            console.log(scandata.hiddenService + ' added to the graph');
        }
    });
});
