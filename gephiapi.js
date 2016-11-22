const request = require('request');

// Helper to send node info to Gephi
export.addNode = function(server, workspace, node, type, callback) {
    var jsonToSend = '{"an":{"' + node + '":{"service_type": "' + type + '","size":10,"Label":"' + node + '"}}}';
    var options = {
        uri: server + '/' + workspace + '?operation=updateGraph',
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
export.addEdge = function(server, workspace, node1, node2, callback) {
    var jsonToSend = '{"ae":{"' + node1 + '_' + node2 + '":{"source":"' + node1 + '","target":"' + node2 + '","directed":false}}}';
    var options = {
        uri: server + '/' + workspace + '?operation=updateGraph',
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
