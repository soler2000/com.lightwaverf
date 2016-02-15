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
				var high1 =300;	//orginal 293					
				var high2 =250;	//orginal 280
				var low1 = 1320;	//orginal 1273
				//iniall, 293,280,1273
				//test 1, 200,250,1260- better than before
				//test 2, 270,260,1300 - better but requires a longer press to register
				//test 2, 250,250,1250 - better but requires a longer press to register
				//test 4, 200,250,1300- much  better than before,, 200 or 280??
				//test 5, 280,260,1300- ok
				//test 6, 300,250,1260- not ok on cmd
				//test 7, 300,250,1160- bad
				//test 8, 300,250,1320- good on offcmd,  not so good on cmd
				//test 9, 300,250,1320- good on offcmd,  not so good on cmd interval: 10000
				//test 10, 250,250,1250- not good
				//test 11, 300,250,1320- sensitivity 0.5
				signal = new Signal({   
					sof: [high1,high2], //Start of frame,Starting 1 added to words due to some starting words beginning on a low
   					eof: [high1], //high1, with high2???   End of frame,Ending 1 added to words due to some ending words ending on a low
					words: [
						[high1,high2,	high1,high2,  	high1,high2,		high1,high2,	high1,		low1,  		high1,high2,	high1,		low1],// 0x0	1+11110110
						[high1,high2,  	high1,high2,		high1,high2,  	high1,		low1,		high1,high2,  	high1,high2,	high1,		low1],// 0x1	1+11101110
						[high1,high2,  	high1,high2,		high1,high2,  	high1,		low1,		high1,high2,  	high1,		low1,		high1,high2],// 0x2	1+11101101
						[high1,high2,  	high1,high2,		high1,high2,  	high1,		low1,		high1,		low1,  		high1,high2,  	high1,high2],// 0x3	1+11101011
						[high1,high2,  	high1,high2,		high1,			low1,  		high1,high2,	high1,high2,  	high1,high2,	high1,		low1],// 0x4	1+11011110
						[high1,high2,  	high1,high2,		high1,			low1,  		high1,high2,	high1,high2,  	high1,		low1,		high1,high2],// 0x5	1+11011101
						[high1,high2,  	high1,high2,		high1,			low1,  		high1,high2,	high1,		low1,  		high1,high2,  	high1,high2],// 0x6	1+11011011
						[high1,high2,	high1,			low1,			high1,high2,	high1,high2,	high1,high2,	high1,high2,	high1,		low1],	// 0x7 1+10111110
						[high1,high2,	high1,			low1, 			high1,high2,	high1,high2,	high1,high2,	high1,		low1,		high1,high2],// 0x8 1+10111101
						[high1,high2,	high1,			low1,			high1,high2,	high1,high2,	high1,		low1,		high1,high2,	high1,high2],// 0x9	1+10111011
						[high1,high2,	high1,			low1,			high1,high2,	high1,		low1,		high1,high2,	high1,high2,	high1,high2],// 0xA	1+10110111
						[high1,			low1,			high1,high2,		high1,high2,	high1,high2,	high1,high2,	high1,high2,	high1,		low1],// 0xB	1+01111110
						[high1,			low1,			high1,high2,		high1,high2,	high1,high2,	high1,high2,	high1,		low1,		high1,high2],// 0xC	1+01111101
						[high1,			low1,			high1,high2,		high1,high2,	high1,high2,	high1,		low1,		high1,high2,	high1,high2],// 0xD	1+01111011
						[high1,			low1,			high1,high2,		high1,high2,	high1,		low1,		high1,high2,	high1,high2,	high1,high2],// 0xE	1+01110111
						[high1,			low1,			high1,high2,		high1,		low1,		high1,high2,	high1,high2,	high1,high2,	high1,high2],// 0xF	1+01101111
					],
					interval: 10000, 	//could be 12500	//Time between repetitions,  this is the time between the total transition of 10 niblets
					repetitions: 6,   	//basic remotes send the whole message 6 times, while the wifilink sends this 25 time
					sensitivity: 0.5, 
					minimalLength: 10,
                    maximalLength: 10
				});
				
				
				signal.register(function( err, success ){
				if(err != null){
				console.log('Somfy: err', err, 'success', success);
				}
				});


				console.log('Start listening');
	
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
		
		
		//Should work ok, providing we give it a deviceID
		deleted: function( device_data ) {
			var index = deviceList.indexOf(getDeviceById(device_data))
			delete deviceList[index];
			console.log('LWitem: Device deleted,   need to remove Homey from Device')
		},
		
		
		
		
		//Capabitities = need to find out more info on fields
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
		
		
		// Pairing: I doubt this will work for any Lightwave products as they dont, as far as i know send any command back
		// giving the item an address it looks to be a 20 digit random number,   
		
		
		pair: function( socket ) {
	
			socket.on('generate', function( data, callback ){
				var address = [];
				for(var i = 0; i < 20; i++){
					address.push(Math.round(Math.random()));
				}	
				address = bitArrayToString(address);
				
				var transID1 = getRandomInt(0,15);
				var transID2 = getRandomInt(0,15);
				var transID3 = getRandomInt(0,15);
				var transID4 = getRandomInt(0,15);
				var transID5 = getRandomInt(0,15);

				console.log('transID Array',transID1,transID2,transID3,transID4,transID5);

				tempdata = {
					address: address,
					transID1   : transID1,
					transID2   : transID2,
					transID3   : transID3,
					transID4   : transID4,
					transID5   : transID5,
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

			//On done this is the call back to the webpage
			socket.on('done', function( data, callback ){
				var idNumber = Math.round(Math.random() * 0xFFFF);
				var id = "" + tempdata.address + tempdata.unit + idNumber; //id is used by Homey-Client
				var name = "LWSocket " + __(driver); //__() Is for translation
				addDevice({
					id       : id,
					address  : tempdata.address,
					transID1   : tempdata.transID1,
					transID2   : tempdata.transID2,
					transID3   : tempdata.transID3,
					transID4   : tempdata.transID4,
					transID5   : tempdata.transID5,
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
						transID1   : tempdata.transID1,
						transID2   : tempdata.transID2,
						transID3   : tempdata.transID3,
						transID4   : tempdata.transID4,
						transID5   : tempdata.transID5,
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
		transID1   : deviceIn.transID1,
		transID2   : deviceIn.transID2,
		transID3   : deviceIn.transID3,
		transID4   : deviceIn.transID4,
		transID5   : deviceIn.transID5,
		onoff    : deviceIn.onoff,
		driver   : deviceIn.driver,
	});
}





function sendOnOff(deviceIn, onoff) {
	
	var device = clone(deviceIn);
	
	//Consider the transmitter iD to be unique to every device so as not to run out of devices
	//TransmitterID  = is generated a unique vale at pairing
	//device set to 1
	//SUB ID set to 1
	
	var command =0;

	//if(typeof tempdata.transID1 == whatever)
	
	var transID1 =0;
	var transID2 =0;
	var transID3 =0;
	var transID4 =0;
	var transID5 =0;
	
	
	
	console.log('*********************************');
	if(device === undefined)
	{ 
		if(tempdata === undefined){
			console.log('tempdata and device data empty');
			//need to load device 
			device = getDeviceById(deviceIn);
			transID1 =  device.transID1;
			transID2 =  device.transID2;
			transID3 =  device.transID3;
			transID4 =  device.transID4;
			transID5 =  device.transID5;
			}
		else
		{
		console.log('tempdata avaliable');
		transID1 =  tempdata.transID1;
		transID2 =  tempdata.transID2;
		transID3 =  tempdata.transID3;
		transID4 =  tempdata.transID4;
		transID5 =  tempdata.transID5;	
			}
		
		}
		else
		{
		console.log('device data avaliable');
		transID1 =  device.transID1;
		transID2 =  device.transID2;
		transID3 =  device.transID3;
		transID4 =  device.transID4;
		transID5 =  device.transID5;
	}
	
	console.log('TransmitterID:',transID1,transID2,transID3,transID4,transID5);
	
	

	//Sending message [ parameter 1, parameter 2, device, command, transID1, transID2, transID3, transID4, transID5, SubID ]
		
	if( onoff == false){
		//send off
		command =0;
	}
	else if(onoff == true){
		//send on
		command =1;
	}
	
	
	//var dataToSend = [ 0, 0, 10, 0, 15, 3, 8, 2, 3, 1 ];
	var dataToSend = [ 0, 0, 10, command, transID1, transID2, transID3, transID4, transID5, 1 ];
	var frame = new Buffer(dataToSend);
	signal.tx( frame, function( err, result ){
   
   		if(err != null)console.log('LWSocket: Error:', err);
	})
	
}




//not sure if temp data exits at this point
//function not used
function generatTransID(tempdata) {
			tempdata.transID1 = getRandomInt(0,15);
			tempdata.transID2 = getRandomInt(0,15);
			tempdata.transID3 = getRandomInt(0,15);
			tempdata.transID4 = getRandomInt(0,15);
			tempdata.transID5 = getRandomInt(0,15);	
}



///Receiver Section




//• 2 Nibbles – 1 byte parameter value (0-255)
//• 1 Nibble device (0-15). 15 reserved for mood control.
//		On remote control devie numbered 1-4 ChannelA , 5-8 Channel B etc,  same device for on and off
//		There is also another set of device numbers shifted when the transmitter ID changes with the Sub iD, this mybe a parsing issue but it does sean to be repeatable

//• 1 Nibble - Command (0-15)
//• 5 Nibbles of Transmitter ID
//• 1 Nibble of Transmitter Sub ID (0-15)


//Command Value Parameter meaning
//Off 0 0-127 Switch a device off param usually 64 (or 0-7 first nibble)
//Off 0 128-159 Set a device level 0-31 (param–128)(or 8-9 first nibble)
//Off 0 160-191 Decrease Brightness(or 10-11 first nibble)
//Off 0 192-255 All off param usually 192 (or 12-15 first nibble)
//On 1 0-31 Switch a device On to last level (or 0-1 first nibble)
//On 1 32-63 Set a device level 0-31 (param–32) (or 2-3 first nibble)
//On 1 64-95 Set a device level 0-31 (param–64) Same effect as 0-31 (or 4-5 first nibble)
//On 1 96-127 Set a device level 0-31 (param–96) Same effect as 0-31 (or 6-7 first nibble)
//On 1 128-159 Set a device level 0-31 (param–128) Same effect as 0-31 (or 8-9 first nibble)
//On 1 160-191 Increase brightness (or 10-11 firest nibble)
//On 1 192-223 Set all to level 0-31 (param–192) (or 12-13 first nibble)
//On 1 224-255 Set all to level 0-31 (param–224) (or 14-15 first nibble)
//Mood 2 130- Start mood n (param–129). (130=Mood1) Device = 15, most liekly moods use the second nibble
//Mood 2 2- Define mood n (param–1). (2=Mood1) Device = 15

function parseRXData(data) {

//received: [ 11, 15, 9, 1, 15, 3, 8, 2, 3, 1 ]


	var parameter = data[0];//and 1
	var parameter1 = data[1];//can ignor the second nibble as we will work with the first one
	var device = data[2];
	var Command = data[3];
	
	
	//static needs to be replaced
	var TransmitterID = data[4].toString(16);
	TransmitterID = TransmitterID + data[5].toString(16);
	TransmitterID = TransmitterID + data[6].toString(16);
	TransmitterID = TransmitterID + data[7].toString(16);
	TransmitterID = TransmitterID + data[8].toString(16);
	
	//var TransmitterID = data[4]; //and 5,6,7,8
	
	
	var TransmitterSubID = data[9];
	
	console.log('*********************************');
	console.log('Parameter:',parameter);
	console.log('device:',device);
	console.log('Command:',Command);
	console.log('TransmitterID:',TransmitterID);
	console.log('TransmitterSubID:',TransmitterSubID);
	
	if(Command == "1")
		{
		//Turn On
		}
	else
		{
		//Turn Off
		}
	
	return { 
		address: address, 
		unit   : unit,
		onoff  : onoff
	};
}


function dec2bin(dec){
    return (dec >>> 0).toString(2);
}

function binarytoString(str) {
  return str.split(/\s/).map(function (val){
    return String.fromCharCode(parseInt(val, 2));
  }).join("");
}

function bitStringToBitArray(str) {
    var result = [];
    for (var i = 0; i < str.length; i++)
        result.push(str.charAt(i) == 1 ? 1 : 0);
    return result;
};

/**
 * Returns a random integer between min (inclusive) and max (inclusive)
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

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