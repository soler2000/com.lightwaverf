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
				console.log('LightwaveRF Socket: Init')
				initFlag = 0;
				var Signal = Homey.wireless('433').Signal;
				
				signal = new Signal({   
					sof: [293,280], //Start of frame,Starting 1 added to words due to some starting words beginning on a low
   					eof: [293], //End of frame,Ending 1 added to words due to some ending words ending on a low
					words: [
						[293,280,	293,280,  	293,280,	293,280,	293,		1273,  		293,280,	293,		1273],// 0x0	1+11110110
						[293,280,  	293,280,	293,280,  	293,		1273,		293,280,  	293,280,	293,		1273],// 0x1	1+11101110
						[293,280,  	293,280,	293,280,  	293,		1273,		293,280,  	293,		1273,		293,280],// 0x2	1+11101101
						[293,280,  	293,280,	293,280,  	293,		1273,		293,		1273,  		293,280,  	293,280],// 0x3	1+11101011
						[293,280,  	293,280,	293,		1273,  		293,280,	293,280,  	293,280,	293,		1273],// 0x4	1+11011110
						[293,280,  	293,280,	293,		1273,  		293,280,	293,280,  	293,		1273,		293,280],// 0x5	1+11011101
						[293,280,  	293,280,	293,		1273,  		293,280,	293,		1273,  		293,280,  	293,280],// 0x6	1+11011011
						[293,280,	293,		1273,		293,280,	293,280,	293,280,	293,280,	293,		1273],	// 0x7 1+10111110
						[293,280,	293,		1273, 		293,280,	293,280,	293,280,	293,		1273,		293,280],// 0x8 1+10111101
						[293,280,	293,		1273,		293,280,	293,280,	293,		1273,		293,280,	293,280],// 0x9	1+10111011
						[293,280,	293,		1273,		293,280,	293,		1273,		293,280,	293,280,	293,280],// 0xA	1+10110111
						[293,		1273,		293,280,	293,280,	293,280,	293,280,	293,280,	293,		1273],// 0xB	1+01111110
						[293,		1273,		293,280,	293,280,	293,280,	293,280,	293,		1273,		293,280],// 0xC	1+01111101
						[293,		1273,		293,280,	293,280,	293,280,	293,		1273,		293,280,	293,280],// 0xD	1+01111011
						[293,		1273,		293,280,	293,280,	293,		1273,		293,280,	293,280,	293,280],// 0xE	1+01110111
						[293,		1273,		293,280,	293,		1273,		293,280,	293,280,	293,280,	293,280],// 0xF	1+01101111
					],
					interval: 10000, 		//Time between repetitions,  this is the time between the total transition of 10 niblets
					repetitions: 6,   	//basic remotes send the whole message 6 times, while the wifilink sends this 25 time
					sensitivity: 0.7, 
					minimalLength: 10,
                    maximalLength: 10
				});
				
				
				signal.register(function( err, success ){
				if(err != null){
				console.log('Somfy: err', err, 'success', success);
				}
				});


				console.log('Start listening')
	
				//Start receiving
				signal.on('payload', function(payload, first){
					console.log('received:', payload);
					var rxData = parseRXData(payload); //Convert received array to usable data
				
				});
				
				
				
				//signal.on('payload', function(payload, first){
				
				//	console.log('received:', payload);
					//if(!first)return; 
			    //   var rxData = parseRXData(payload); //Convert received array to usable data
			       
		        	//if(rxData.unit == "001") { //If the all button is pressed
		        	//	devices = getDeviceByAddress(rxData);
		        	//	devices.forEach(function(device){
		        	//		updateDeviceOnOff(self, device, rxData.onoff);
		        	//	});
		        	//}else{
		        	//var devices = getDeviceByAddressAndUnit(rxData);
		        	//devices.forEach(function(device){
					//	updateDeviceOnOff(self, device, rxData.onoff);
					//});
		        //	}
				//});
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
			console.log('LWSocket: Device deleted')
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
				var name = "LWSocket " + __(driver); //__() Is for translation
				addDevice({
					id       : id,
					address  : tempdata.address,
					unit     : tempdata.unit,
					onoff    : false,
					driver   : driver,
				});
				console.log('LWSocket: Added device: address',tempdata.address,'unit',tempdata.unit);

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


//is this only for clone
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
		if(err != null)console.log('LWSocket: Error:', err);
    })
}

//• 2 Nibbles – 1 byte parameter value (0-255)
//• 1 Nibble device (0-15). 15 reserved for mood control.
//• 1 Nibble - Command (0-15)
//• 5 Nibbles of Transmitter ID
//• 1 Nibble of Transmitter Sub ID (0-15)


function parseRXData(data) {

//received: [ 11, 15, 9, 1, 15, 3, 8, 2, 3, 1 ]


	var parameter = data[0];//and 1
	var device = data[2];
	var Command = data[3];
	var TransmitterID = data[4]; //and 5,6,7,8
	var TransmitterSubID = data[9];
	console.log('Parameter:',parameter);
	console.log('device:',device);
	console.log('Command:',Command);
	console.log('TransmitterID:',TransmitterID);
	console.log('TransmitterSubID:',TransmitterSubID);
	
	//console.log(data)
	
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