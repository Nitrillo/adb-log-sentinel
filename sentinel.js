var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var fs = require("fs");

var devices_connected = []

var logcat_dumper = function(device_name) {
    console.log("New device... " + device_name);
    devices_connected.push(device_name);

    var child_logcat = spawn('adb', ['-s', device_name, 'logcat', '-v', 'threadtime']);
    var now = new Date();
    var file_name = "out/" + now.toISOString() + "_" + device_name + ".log";
    var in_test = null
    child_logcat.stdout.on('data', function(data) {
        var lines = data.toString().match(/[^\r\n]+/g);
        if (lines) {
            for (var i=0; i < lines.length; i++) {
                fs.appendFile(file_name, lines[i] + '\n', function (err) {
                });
                var idxStart = lines[i].indexOf('TestRunner: started:');
                if ( idxStart !== -1) {
                    idxStart += 'TestRunner: started: '.length
                    var now = new Date();
                    in_test = "out/" + now.toISOString() + "_" + device_name + "_" + (lines[i].substring(idxStart)) + ".log"
                }
                if (in_test !== null) {
                    fs.appendFile(in_test, lines[i] + '\n', function (err) {
                    });
                    if ( lines[i].indexOf('TestRunner: finished:') !== -1) {
                        in_test = null;
                    }
                }
            }
        }
    });
    child_logcat.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });
    child_logcat.on('exit', function(code) {
        console.log("Closing logcat...");
        var index = devices_connected.indexOf(device_name);
        if (index > -1) {
            devices_connected.splice(index, 1);
        }
    });            
}

var process_devices = function(){ 
    var child = exec('adb devices');
    child.stdout.on('data', function(data) {

        devices_output = data.match(/[^\r\n]+/g);

        for (var i = 1; i < devices_output.length; i++) {
            device = devices_output[i].split("\t");
            if (device[1] && device[1] == "device") {
                found = false;
                for (var j = 0; j < devices_connected.length; j++) {
                    if (devices_connected[j] == device[0]) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    logcat_dumper(device[0])
                }
            }
        }
    });
 }

setInterval(process_devices, 10000);
process_devices();
