var clone = require('clone');
var deviceList = [];
var tempdata = {};
var signal;
var initFlag = 1;
//var tempdata = {};

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
				console.log('LightwaveRF: err', err, 'success', success);
				}
				});


				console.log('Start listening');
	
				//Start receiving
				signal.on('payload', function(payload, first){
					
					
					console.log('*****************Pay load recieved****************');
					console.log('received:', payload);
					var rxData = parseRXData(payload); //Convert received array to usable data
				
					//below code works like relaying remote data
					//if(!first)return; 
			    //   var rxData = parseRXData(payload); //Convert received array to usable data
			       
		        	//if(rxData.unit == "001") { //If the all button is pressed
					//console.log('TransmitterSubID:',TransmitterSubID);
		        	//devices = getDeviceByAddress(rxData);
		        	//	devices.forEach(function(device){
		        	//		updateDeviceOnOff(self, device, rxData.onoff);
		        	//	});
		        	//}else{
		        	//var devices = getDeviceByAddressAndUnit(rxData);
		        	//devices.forEach(function(device){
					//	updateDeviceOnOff(self, device, rxData.onoff);
					//});
		        //	}
				});
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
			console.log('LWitem: Device deleted,   need to remove Homey from Device');//added semi colon
		},
		
		
		
		
	
		capabilities: {
			onoff: {
				get: function( device_data, callback ) {
					var device = getDeviceById(device_data);
					callback( null, device.onoff );
				},
				set: function( device_data, onoff, callback ) {
				
				//device data is present
				console.log('device data, must be comming from front end',device_data );
					//either data is not being saved or data not retrieved
					var devices = getDeviceById(device_data);
					//devices.forEach(function(device){
					//presumably this is a call to the device to update the front end
				updateDeviceOnOff(self, device_data, onoff)
					//});	
					//console.log('sendOnOff(devices[0], onoff);')
					//console.log('sendOnOff(devices[0]',devices[0])
					sendOnOff(device_data, device_data.onoff);
					console.log('sendOnOff finished;')
					callback( null, onoff );
				
				
				
				
				
					
	/*				console.log('capabilities: device_data ID',device_data.id);
					var devices = getDeviceById(device_data);
					
					//console.log('Number of devices returned - not working, always returns null', devices.length); //
					
					
					if(devices == null)
						{console.log('No devices returned');
						//console.log('device data',device_data );
						}
					else
						{
						console.log('Devices returned');
						console.log('device data',device_data );
						}
					
					
				
				
				
				
				
				
				
				
					
					devices.forEach(function(device){
						//console.log('Running though each for each command');
						//console.log('capabilities: Device ID',device.id);
						//console.log('capabilities Transid',device.transID);//devices is array so cannot read just one transid
						updateDeviceOnOff(self, device, onoff) //added semi colon
					});	
					sendOnOff(devices[0], onoff);
					callback( null, onoff );	*/	
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
				console.log('transID1',transID1);
				console.log('transID2',transID2);
				console.log('transID3',transID3);
				console.log('transID4',transID4);
				console.log('transID5',transID5);
				
				
				
				
				var transID = Number(transID1).toString(16)+ Number(transID2).toString(16) +Number(transID3).toString(16) +Number(transID4).toString(16) + Number(transID5).toString(16);
				console.log('transID in Temp data',transID);

				tempdata = {
					address: address,
					transID    : transID,
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
					
					//no transmitter call back
			       // if(rxData.address == tempdata.address && rxData.unit == tempdata.unit){
//						if(rxData.onoff){
//							socket.emit('received_on'); //Send signal to frontend
//						}else{
//							socket.emit('received_off'); //Send signal to frontend
//						}
//					}
				});
				callback(null, tempdata.onoff);
			});

			socket.on('sendSignal', function( onoff, callback ){
				if(onoff != true){
					onoff = false;
				}
				sendOnOff(tempdata, onoff);
				var devices = getDeviceBytransIDAndUnit(tempdata);
				devices.forEach(function(device){
					updateDeviceOnOff(self, device, onoff)
				});	
				callback();
			});

			//On done this is the call back to the webpage
			socket.on('done', function( data, callback ){
				var idNumber = Math.round(Math.random() * 0xFFFF);
				var id = tempdata.address;// + idNumber; //id is used by Homey-Client
				var name = "LWSocket " + __(driver); //__() Is for translation
				addDevice({
					id       : id,
					address  : tempdata.address,
					transID   : tempdata.transID,
					transID1   : tempdata.transID1,
					transID2   : tempdata.transID2,
					transID3   : tempdata.transID3,
					transID4   : tempdata.transID4,
					transID5   : tempdata.transID5,
					onoff    : false,
					driver   : driver,
				});
				console.log('LWSocket: Added device: ID',id);

				//Share data to front end
				callback(null, {
					name: name,
					data: {
						id       : id,
						address  : tempdata.address,
						transID   : tempdata.transID,
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


//added 20-2
function getDeviceByTransId(deviceIn) {
	var matches = deviceList.filter(function(d){
		return d.transID == deviceIn.transID;
	});
	return matches ? matches[0] : null;
}



function getDeviceById(deviceIn) {
	var matches = deviceList.filter(function(d){
		return d.id == deviceIn.id;
	});
	return matches ? matches[0] : null;
}

function getDeviceBytransIDAndUnit(deviceIn) {
	var matches = deviceList.filter(function(d){
		return d.transID == deviceIn.transID && d.unit == deviceIn.unit; 
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
	console.log('update device called')
	device.onoff = onoff;
	self.realtime(device, 'onoff', onoff);
}

function addDevice(deviceIn) {
	deviceList.push({
		id       : deviceIn.id,
		transID1   : deviceIn.transID1,
		transID2   : deviceIn.transID2,
		transID3   : deviceIn.transID3,
		transID4   : deviceIn.transID4,
		transID5   : deviceIn.transID5,
		transID   : deviceIn.transID1.tostring + deviceIn.transID2.tostring + deviceIn.transID3.tostring + deviceIn.transID4.tostring + deviceIn.transID5.tostring,
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
	var transID =0;
	var transID1 =0;
	var transID2 =0;
	var transID3 =0;
	var transID4 =0;
	var transID5 =0;
	
	
	
	console.log('****************Send on off*****************');
	//console.log('device in', deviceIn.id);
	
	//device is avaliable in pairing but ID is null as it has not been assigned in the temp data
	if(device === undefined)
	{
		console.log('In send on off the device is undefined');
		//deviceIn = getDeviceById(device);
	}
	console.log('device in', device.id);
	
	
	/*{ 
		if(tempdata === undefined){
			console.log('tempdata and device data empty');
			//need to load device 
			device = getDeviceById(deviceIn);
			transID =  device.transID1+device.transID2+device.transID3+device.transID4+device.transID5;
			transID1 =  device.transID1;
			transID2 =  device.transID2;
			transID3 =  device.transID3;
			transID4 =  device.transID4;
			transID5 =  device.transID5;
			}
		else
		{
		console.log('tempdata avaliable');
		transID =  tempdata.transID1+tempdata.transID2+tempdata.transID3+tempdata.transID4+tempdata.transID5;
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
		transID =  device.transID1+device.transID2+device.transID3+device.transID4+device.transID5;
		transID1 =  device.transID1;
		transID2 =  device.transID2;
		transID3 =  device.transID3;
		transID4 =  device.transID4;
		transID5 =  device.transID5;
	}*/
	console.log('Send On / Off, device:',device);
	
	console.log('TransmitterID:',device.transID1,device.transID2,device.transID3,device.transID4,device.transID5);
	
	

	//Sending message [ parameter 1, parameter 2, device, command, transID1, transID2, transID3, transID4, transID5, SubID ]
		
	if( onoff == false){
		//send off
		command =0;
			console.log('LWSocket: Sending off:', command );
	}
	else if(onoff == true){
		//send on
		command =1;
		console.log('LWSocket: Sending on:', command );
	}
	
	
	//var dataToSend = [ 0, 0, 10, 0, 15, 3, 8, 2, 3, 1 ];
	var dataToSend = [ 0, 0, 10, command, device.transID1, device.transID2, device.transID3, device.transID4, device.transID5, 1 ];
	var frame = new Buffer(dataToSend);
	console.log('LWSocket: Sending Data:', dataToSend );
	
	
	///not sending signal
	signal.tx( frame, function( err, result ){
   		console.log('LWSocket: Sending Data:', dataToSend );
   		if(err != null)console.log('LWSocket: Error:', err);
	})
	
}




//not sure if temp data exits at this point
//function is not in use
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
	var parameter1 = data[1];
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
	
	console.log('*****************Parsing RX Data****************');
	console.log('Parameter:',parameter);
	console.log('Parameter1:',parameter1);
	console.log('device:',device);
	console.log('Command:',Command);
	console.log('TransmitterID:',TransmitterID);
	console.log('TransmitterSubID:',TransmitterSubID);
	
	getDeviceByTransId(TransmitterID);
	
	console.log('TransmitterSubID:',TransmitterSubID);
	
	if(Command == "1")
		{
		//Turn On
		onoff = true;
		}
	else
		{
		//Turn Off
		onoff = false;
		}
	
	return { 
		parameter 			: parameter,
		parameter1 			: parameter1,
		device				: device,
		TransID				: TransmitterID, 
		TransmitterSubID  	: TransmitterSubID,
		device   			: device,
		Command  			: Command,
		onoff    			: onoff
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