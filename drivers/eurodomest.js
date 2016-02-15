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
				console.log('Eurodomest: Init')
				initFlag = 0;
				var Signal = Homey.wireless('433').Signal;
				signal = new Signal({   
					sof: [], //Start of frame
				   	eof: [295], //End of frame
					words: [
						[295, 885],	// 0
						[885, 295]	// 1
					],
					interval: 9565, //Time between repititions
					repetitions: 20,
					sensitivity: 0.7, 
					minimalLength: 24,
	   				maximalLength: 24
				});	

				signal.register(function( err, success ){
				    if(err != null){
				    	console.log('Eurodomest: err', err, 'success', success);
				    }
				});

				//Start receiving
				signal.on('payload', function(payload, first){
					if(!first)return; 
			        var rxData = parseRXData(payload); //Convert received array to usable data
		        	if(rxData.unit == "001") { //If the all button is pressed
		        		devices = getDeviceByAddress(rxData);
		        		devices.forEach(function(device){
		        			updateDeviceOnOff(self, device, rxData.onoff);
		        		});
		        	}else{
		        		var devices = getDeviceByAddressAndUnit(rxData);
		        	devices.forEach(function(device){
						updateDeviceOnOff(self, device, rxData.onoff);
					});
		        	}
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
			console.log('Eurodomest: Device deleted')
		},
		
		capabilities: {
			onoff: {
				get: function( device_data, callback ) {
					var device = getDeviceById(device_data);
					callback( null, device.onoff );
				},
				set: function( device_data, onoff, callback ) {
					var devices = getDeviceByAddressAndUnit(device_data);
					devices.forEach(function(device){
						updateDeviceOnOff(self, device, onoff)
					});	
					sendOnOff(devices[0], onoff);
					callback( null, onoff );		
				}
			}
		},
		
		pair: function( socket ) {
			socket.on('imitate', function learn( data, callback ){
				signal.once('payload', function(payload, first){
					var rxData = parseRXData(payload);
					tempdata = {
						address: rxData.address,
						unit  : rxData.unit,
						onoff : rxData.onoff
					}	
					socket.emit('remote_found'); //Send signal to frontend
				});
				callback();
			});
			
			socket.on('generate', function( data, callback ){
				var address = [];
				for(var i = 0; i < 20; i++){
					address.push(Math.round(Math.random()));
				}	
				address = bitArrayToString(address);

				var unit = [];
				for(var i = 0; i < 3; i++){
					unit.push(Math.round(Math.random()));
				}	
				unit = bitArrayToString(unit);

				tempdata = {
					address: address,
					unit   : unit,
					onoff  : false
				}	

				sendOnOff(tempdata, true);

				callback();
			});

			socket.on('test_device', function( data, callback ){
				signal.on('payload', function(payload, first){
					if(!first)return;
			        var rxData = parseRXData(payload);
			        if(rxData.address == tempdata.address && rxData.unit == tempdata.unit){
						if(rxData.onoff){
							socket.emit('received_on'); //Send signal to frontend
						}else{
							socket.emit('received_off'); //Send signal to frontend
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
				var devices = getDeviceByAddressAndUnit(tempdata);
				devices.forEach(function(device){
					updateDeviceOnOff(self, device, onoff)
				});	
				callback();
			});

			socket.on('done', function( data, callback ){
				var idNumber = Math.round(Math.random() * 0xFFFF);
				var id = "" + tempdata.address + tempdata.unit + idNumber; //id is used by Homey-Client
				var name = "Eurodomest " + __(driver); //__() Is for translation
				addDevice({
					id       : id,
					address  : tempdata.address,
					unit     : tempdata.unit,
					onoff    : false,
					driver   : driver,
				});
				console.log('Eurodomest: Added device: address',tempdata.address,'unit',tempdata.unit);

				//Share data to front end
				callback(null, {
					name: name,
					data: {
						id       : id,
						address  : tempdata.address,
						unit     : tempdata.unit,
						onoff    : false,
						driver   : driver,
					}
				});
			});
		},
	};
	return self;
}

function getDeviceById(deviceIn) {
	var matches = deviceList.filter(function(d){
		return d.id == deviceIn.id;
	});
	return matches ? matches[0] : null;
}

function getDeviceByAddressAndUnit(deviceIn) {
	var matches = deviceList.filter(function(d){
		return d.address == deviceIn.address && d.unit == deviceIn.unit; 
	});
	return matches ? matches : null;
}

function getDeviceByAddress(deviceIn) {
	var matches = deviceList.filter(function(d){
		return d.address == deviceIn.address; 
	});
	return matches ? matches : null;
}

function updateDeviceOnOff(self, device, onoff){
	device.onoff = onoff;
	self.realtime(device, 'onoff', onoff);
}

function addDevice(deviceIn) {
	deviceList.push({
		id       : deviceIn.id,
		address  : deviceIn.address,
		unit     : deviceIn.unit,
		onoff    : deviceIn.onoff,
		driver   : deviceIn.driver,
	});
}

function sendOnOff(deviceIn, onoff) {
	var device = clone(deviceIn);
	if(device.unit == "001" && onoff == false){
		device.unit = "000";
		onoff = true;
	}else if(device.unit == "001" && onoff == true){
		onoff = false;
	}
	address = bitStringToBitArray(device.address);
	unit    = bitStringToBitArray(device.unit);
	onoff   = [onoff ? 1 : 0];
	
	var frame = new Buffer(address.concat(unit, onoff));
	signal.tx( frame, function( err, result ){
		if(err != null)console.log('Eurodomest: Error:', err);
    })
}

function parseRXData(data) {
	var address = data.slice(0, 20);
	address = bitArrayToString(address);

	var unit = data.slice(20, 23);
	unit = bitArrayToString(unit);

	var onoff = data.slice(23, 24);
	onoff = onoff && onoff[0] ? true : false;

	if(unit == "000"){
		unit = "001";
		onoff = false;
	}else if(unit == "001"){
		onoff = true;
	}
	return { 
		address: address, 
		unit   : unit,
		onoff  : onoff
	};
}

function bitStringToBitArray(str) {
    var result = [];
    for (var i = 0; i < str.length; i++)
        result.push(str.charAt(i) == 1 ? 1 : 0);
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