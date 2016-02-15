var clone = require('clone');
var deviceList = [];
var tempdata = {};
var signal;
var initFlag = 1;
var tempdata = {};

function createDriver(driver) {
	var self = {
		init: function( devices, callback ) {
			//Define signal
			if(initFlag){
				console.log('Impuls: Init')
				initFlag = 0;
				var Signal = Homey.wireless('433').Signal;
				signal = new Signal({   
					sof: [],
				   	eof: [190],
				 	words: [
						[190, 570, 190, 570], 	// 0
						[570, 190, 570, 190],	// 1
						[190, 570, 570, 190]    // 2
					],
					interval: 5890,
					repetitions: 20,
					sensitivity: 0.7,
					minimalLength: 12,
	    			maximalLength: 12
				});	
				signal.register(function( err, success ){
				    if(err != null){
				    	console.log('Impuls: err', err, 'success', success);
				    }
				});
				
				//Start receiving
				signal.on('payload', function(payload, first){
					if(!first)return;
			        var rxData = parseRXData(payload);
			        var devices = getDeviceByAddress(rxData);
		        	devices.forEach(function(){
		        		updateDeviceOnOff(self, rxData, rxData.onoff);
		        	});
				});
			}

			//Refresh deviceList
			devices.forEach(function(device){
				addDevice(device);
			});
			callback();
		},
		
		deleted: function( device_data ) {
			var index = deviceList.indexOf(getDeviceById(device_data))
			delete deviceList[index];
			console.log('Impuls: Device deleted')
		},
		
		capabilities: {
			onoff: {
				get: function( device_data, callback ) {
					var device = getDeviceById(device_data);
					callback( null, device.onoff );
				},
				set: function( device_data, onoff, callback ) {
					var devices = getDeviceByAddress(device_data);
					devices.forEach(function(device){
						updateDeviceOnOff(self, device, onoff);
					});
					sendOnOff(devices[0], onoff);
					callback( null, onoff );		
				}
			}
		},
		
		pair: function( socket ) {
			
			socket.on('Storedata', function(data, callback){
				var address = data.slice(0,5);
				for(var i = 0; i < 5; i++)
				{
					address[i] = address[i] ? 1: 2;
				}
				address = bitArrayToString(address);
				var unit = data.slice(5,10);
				for(var i = 0; i < 5; i++)
				{
					unit[i] = unit[i] ? 0: 2;
				}
				unit = bitArrayToString(unit);

				tempdata = {
					address: address,
					unit   : unit,
					onoff  : false
				}
				callback();
			}),

			socket.on('imitate', function learn( data, callback ){
				signal.once('payload', function(payload) {
					var rxData = parseRXData(payload);
					console.log('Impuls: Remote found');
					tempdata = {
						address: rxData.address,
						unit  : rxData.unit,
						onoff : rxData.onoff
					}	
					socket.emit('remote_found');
					callback();
				});
			});

			socket.on('test_device', function( data, callback ){
				if(tempdata.address == null || tempdata.unit == null){
					tempdata = {
						address: '22222',
						unit: '02222',
						onoff: false
					};
				}
				signal.on('payload', function(payload, first){
					if(!first)return;
			        var rxData = parseRXData(payload);
			        if(rxData.address == tempdata.address && rxData.unit == tempdata.unit){
						if(rxData.onoff){
							socket.emit('received_on');
						}else{
							socket.emit('received_off');
						}
					}
				});
				callback(null, tempdata.onoff);
			});

			socket.on('sendSignal', function( onoff, callback ){
				if(onoff != true){
					onoff = false;
				}
				sendOnOff(tempdata, onoff);
				var devices = getDeviceByAddress(tempdata);
				devices.forEach(function(device){
					updateDeviceOnOff(self, device, onoff)
				});	
				callback();
			});

			socket.on('addDevice', function( data, callback ){
				var idNumber = Math.round(Math.random() * 0xFFFF);
				var id = "" + tempdata.address + tempdata.unit + idNumber; //id is for self.realtime
				addDevice({
					id      : id,
					address : tempdata.address,
					unit    : tempdata.unit,
					onoff   : false,
					driver  : driver
				});

				console.log('Impuls: Added device: address',tempdata.address,'unit',tempdata.unit);

				var name = "Impuls ";
				for(var i = 0; i < 5; i++){
					if(tempdata.address[i] == 1){
						name = name + "↑";
					}else{
						name = name + "↓";
					}
				}

				if(tempdata.unit[0] == 0){
					name = name + ' A';
				}
				if(tempdata.unit[1] == 0){
					name = name + ' B';
				}
				if(tempdata.unit[2] == 0){
					name = name + ' C';
				}
				if(tempdata.unit[3] == 0){
					name = name + ' D';
				}
				if(tempdata.unit[4] == 0){
					name = name + ' E';
				}

				callback(null, {
					name: name,
					data: {
						id      : id,
						address : tempdata.address,
						unit    : tempdata.unit,
						onoff   : false,
						driver  : driver,
					}
				});
			});
		},
	};
	return self;
}

function getDeviceByAddress(deviceIn) {
	var matches = deviceList.filter(function(d){
		return d.address == deviceIn.address && d.unit == deviceIn.unit; 
	});
	return matches ? matches : null;
}

function getDeviceById(deviceIn) {
	var matches = deviceList.filter(function(d){
		return d.id == deviceIn.id;
	});
	return matches ? matches[0] : null;
}

function updateDeviceOnOff(self, device, onoff){
	device.onoff = onoff;
	self.realtime(device, 'onoff', onoff);
}

function addDevice(deviceIn) {
	deviceList.push({
		id      : deviceIn.id,
		address : deviceIn.address,
		unit    : deviceIn.unit,
		onoff   : deviceIn.onoff,
		driver  : deviceIn.driver,
	});
}

function sendOnOff(deviceIn, onoff) {
	var device = clone(deviceIn);
	address = bitStringToBitArray(device.address);
	unit    = bitStringToBitArray(device.unit);
	var frame = new Buffer(address.concat(unit, !onoff ? 0 : 2, onoff ? 0 : 2));
	signal.tx( frame, function( err, result ){
		if(err != null)console.log('Impuls: Error:', err);
    })
}


function parseRXData(data) {
	var address = data.slice(0, 5);
	var new_address = bitArrayToString(address);

	var unit = data.slice(5, 10);
	var new_unit = bitArrayToString(unit);

	var onoff = data.slice(11, 12);
	var new_onoff = onoff ? true : false;

	return { 
		address: new_address, 
		unit   : new_unit,
		onoff  : new_onoff
	};
}


function bitStringToBitArray(str) {
    var result = [];
    for (var i = 0; i < str.length; i++)
        result.push(str.charAt(i));
    return result;
};

function bitArrayToString(bits) {
    return bits.join("");
};

function numberToBitArray(number, bit_count) {
    var result = [];
    for (var i = 0; i < bit_count; i++)
        result[i] = (number >> i) & 1;
    return result;
};

module.exports = {
	createDriver: createDriver
};