var tls = require('tls');
var net = require('net');
var fs = require('fs');
module.exports = function(config) {
    var stream;
    return {
        "clientResponse": function(xml) {
            console.log("Received: ", xml);
        },
        "setStream": function(newStream) {
            stream = newStream;
        },
        "initStream": function(onConnectCallback) {
            var self = this;
            try {
                var newStream;
                if (config.ssl) {

                    var options = {
                        "host": config.host,
                        "port": config.port,
                        "rejectUnauthorized": false,
                        "secureProtocol": "SSLv3_method"
                    };
                    //if (config.key) {
                        //options.key = fs.readFileSync(config.key);
                    //}
                    //if (config.cert) {
                        //options.cert = fs.readFileSync(config.cert);
                    //}

                    newStream = tls.connect(options, function(data) {
                        console.log("Client connected securely: ", data);
                        self.setStream(this);
                        onConnectCallback();
                    });
                } else {
                    var socket = new net.Socket();
                    newStream = socket.connect(config.port, config.host, function() {
                        console.log("Client connected insecurely");
                        self.setStream(this);
                        onConnectCallback();
                    });
                }
                newStream.on('readable', function() {
                    var bigEndian = this.read(4);
                    console.log("big endian: ", bigEndian);
                    var xmlLength = bigEndian.readUInt32BE(0) - 4;
                    //this.setEncoding('utf8');
                    var xml = this.read();
                    console.log("Received: ", xml.toString());
                    self.clientResponse(xml);
                });
                newStream.on('end', function() {
                    console.log("Got an end event");
                    server.close();
                });
            } catch(e) {
                console.log("Got error: ", e);
            }
        },
        "prepareXML": function(xml) {
            var xmlBuffer = new Buffer(xml);

            var xmlLength = xml.length;
            var endianLength = xml.length + 4;
            var b = new Buffer(4);
            b.writeUInt32BE(endianLength, 0);
            var preppedXML = Buffer.concat([b, xmlBuffer]);
            return preppedXML;
        },
        // Pushes stuff into the stream
        "send": function(xml, clientResponse) {
            this.clientResponse = clientResponse;
            var preparedXML = this.prepareXML(xml);

            console.log("Calling write with ", preparedXML.toString());
            stream.write(preparedXML, "utf8", function() {
                console.log("Finished writing to server");
            });
        }
    };

};
