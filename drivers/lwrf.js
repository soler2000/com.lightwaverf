var clone = require('clone');
var deviceList = [];
var tempdata = {};
var signal;
var initFlag = 1;
//var tempdata = {};
var pauseSpeed 		= 500;


function createDriver(driver) {
	var self = 
		{
			init: function( devices, callback ) 
			{
				//Define signal
				if(initFlag)
					{
					console.log('LightwaveRF: Init')
					initFlag = 0;
					var Signal = Homey.wireless('433').Signal;
					var high1 =300;	//orginal 293	14-15 samples at 48khz				
					var high2 =300;	//orginal 280  14-15 samples at 48khz
					var low1 = 1350;	//orginal 1273  65 samples at 48khz
					signal = new Signal(
						{   
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
						interval: 10750, 	//Time between repetitions,  this is the time between the total transition of 10 niblets
						repetitions: 6,   	//basic remotes send the whole message 6 times, while the wifilink sends this 25 time
						sensitivity: 0.5, 
						minimalLength: 10,
                    	maximalLength: 10
						});
					
						
					signal.register(function( err, success ){
					if(err != null)
						{
						console.log('LightwaveRF: err', err, 'success', success);
						}
					});
						
							
					console.log('Start listening');
					
					//Start receiving
					signal.on('payload', function(payload, first)
						{
							console.log('*****************Pay load received****************');
							console.log('received:', payload);
							var rxData = parseRXData(payload); //Convert received array to usable data
						});
					}
							
				//Refresh deviceList
				devices.forEach(function(device)
					{
						console.log('Refresh device list');
					addDevice(device);
					});
				callback();
			},//end if init
		

			deleted: function( device_data ) 
			{
				var index = deviceList.indexOf(getDeviceById(device_data));
				delete deviceList[index];
				console.log('LW item: Device deleted,  need to remove Homey from Device');
			},//end of deleted
		
			capabilities: {
						onoff: {
							get: function( device_data, callback ) 
								{
									console.log('capabilities get onoff');
									var device = getDeviceById(device_data);
									callback( null, device.onoff );
								},//end of get
							set: function( device_data, onoff, callback ) 
								{
									console.log('capabilities set onoff');
									console.log('device data, must be comming from front end',device_data );
									var devices = getDeviceById(device_data);
									//devices.forEach(function(device){
									updateDeviceOnOff(self, device_data, onoff)
									sendOnOff(device_data, device_data.onoff);
									callback( null, onoff );
								}//end of set
						},//end of Offon
					dim: {
						get: function( device_data, callback )
							{
								console.log('capabilities get dim');
								//getDim(device_data, function(err, dimLevel) 
								//{
									//Homey.log('Get dim:', dimLevel);
									//module.exports.realtime( device, 'dim', 0.8);//dimLevel );
									callback( null, 0.8);//dimLevel ) //New state
								//});
							},//end of get
		
						set: function( device_data, dim, callback )
							{
								console.log('capabilities set dim', device_data);
								setDim(device_data, dim, function(err, dimLevel) 
									{
										Homey.log('Set dim:', dimLevel);
										//module.exports.realtime( device, 'dim', dimLevel );
										callback( null, dimLevel ) //New state
									});		
							}// end of set
						}// end of dim			
		}, //end of capabilities
		
	
		
		pair: function( socket ) {
			socket.on('generate', function( data, callback )
				{
					var address = [];
					for(var i = 0; i < 20; i++)
						{
							address.push(Math.round(Math.random()));
						}	
					address = bitArrayToString(address);
					var transID1 = getRandomInt(0,15);
					var transID2 = getRandomInt(0,15);
					var transID3 = getRandomInt(0,15);
					var transID4 = getRandomInt(0,15);
					var transID5 = getRandomInt(0,15);
					console.log('pair about to add');
					var dim = 1;
					console.log('transID1',transID1);	
					console.log('transID2',transID2);
					console.log('transID3',transID3);
					console.log('transID4',transID4);
					console.log('transID5',transID5);
				
				var transID = Number(transID1).toString(16)+ Number(transID2).toString(16) +Number(transID3).toString(16) +Number(transID4).toString(16) + Number(transID5).toString(16);
				console.log('transID in Temp data',transID);

				tempdata = 
					{
					address: address,
					transID    : transID,
					transID1   : transID1,
					transID2   : transID2,
					transID3   : transID3,
					transID4   : transID4,
					transID5   : transID5,
					dim		   : dim,
					onoff  	   : true,
					}	

				sendOnOff(tempdata, true);
				callback();
			});//end of socket on

			socket.on('test_device', function( data, callback )
				{
					signal.on('payload', function(payload, first)
						{
							if(!first)return;
			        		var rxData = parseRXData(payload);
					
							//no transmitter call back
			       			//if(rxData.address == tempdata.address && rxData.unit == tempdata.unit){
							//if(rxData.onoff){
								//socket.emit('received_on'); //Send signal to frontend
								//}else{
								//socket.emit('received_off'); //Send signal to frontend
							//}
							//}
						});
					callback(null, tempdata.onoff);
				});// end of socket on
			
			socket.on('sendSignal', function( onoff, callback )
				{
					if(onoff != true){
						onoff = false;
						}
					sendOnOff(tempdata, onoff);
					var devices = getDeviceByTransId(tempdata);
					//commented out as cannot find devices???
					//devices.forEach(function(device){
					//	updateDeviceOnOff(self, device, onoff)
						//});	
						
						updateDeviceOnOff(self, tempdata, onoff);
						
					callback();
				});// end of socket on
				
				
			socket.on('done', function( data, callback )
				{
					var idNumber = Math.round(Math.random() * 0xFFFF);
					var id = tempdata.address;// + idNumber; //id is used by Homey-Client
					var name = "LW " + __(driver); //__() Is for translation
					console.log('adding device in socket on');
					console.log('tempdata.dim',tempdata.dim);
					addDevice({
						id       	: id,
						address  	: tempdata.address,
						transID   	: tempdata.transID,
						transID1   	: tempdata.transID1,
						transID2   	: tempdata.transID2,
						transID3   	: tempdata.transID3,
						transID4   	: tempdata.transID4,
						transID5   	: tempdata.transID5,
						dim			: tempdata.dim,
						onoff    	: false,
						driver   	: driver,
						});
					console.log('LWSocket: Added device: ID',id);
				
					//Share data to front end
					callback(null, 
						{
							name: name,
							data: {
								id       	: id,
								address  	: tempdata.address,
								transID   	: tempdata.transID,
								transID1   	: tempdata.transID1,
								transID2   	: tempdata.transID2,
								transID3   	: tempdata.transID3,
								transID4   	: tempdata.transID4,
								transID5   	: tempdata.transID5,
								dim			: tempdata.dim,
								onoff    	: false,
								driver   	: driver,
								}
						});// end of call back
				});//end of socket on
		},//end of pair
	};// end of capabilities
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
	//adds device from pairing page
	console.log('adding device');
	deviceList.push({
		id       	: deviceIn.id,
		transID1   	: deviceIn.transID1,
		transID2   	: deviceIn.transID2,
		transID3   	: deviceIn.transID3,
		transID4   	: deviceIn.transID4,
		transID5   	: deviceIn.transID5,
		transID   	: deviceIn.transID1.tostring + deviceIn.transID2.tostring + deviceIn.transID3.tostring + deviceIn.transID4.tostring + deviceIn.transID5.tostring,
		dim			: deviceIn.dim,
		onoff    	: deviceIn.onoff,
		driver   	: deviceIn.driver,
	});
	
	console.log('Adding Device Dim level', deviceIn.dim);
	console.log('finished adding');
}





function sendOnOff(deviceIn, onoff) {
	
	var device = clone(deviceIn);
	
	//Consider the transmitter iD to be unique to every device so as not to run out of devices
	//TransmitterID  = is generated a unique vale at pairing
	//device set to 1
	//SUB ID set to 1
	
	var command =0;
	var transID =0;
	var transID1 =0;
	var transID2 =0;
	var transID3 =0;
	var transID4 =0;
	var transID5 =0;
	
	
	
	console.log('****************Send on off*****************');
	if(device === undefined)
	{
		console.log('In send on off the device is undefined');
	}
	console.log('device ID', device.id);
	console.log('Send On / Off, device:',device);
	console.log('TransmitterID:',device.transID1,device.transID2,device.transID3,device.transID4,device.transID5);
	
		
	if( onoff == false){
		//send off
		command =0;
		//deviceIn.onoff = false;  not working
	}
	else if(onoff == true){
		//send on
		command =1;
		//deviceIn.onoff = true;
	}
	

	var dataToSend = [ 0, 0, 10, command, device.transID1, device.transID2, device.transID3, device.transID4, device.transID5, 1 ];
	var frame = new Buffer(dataToSend);
	
	signal.tx( frame, function( err, result ){
   		if(err != null)console.log('LWSocket: Error:', err);
		
		//need to make this work to send data back
		//callback( null, deviceIn.onoff ); //Callback the new dim
	})
	
}



// Get the Dim
function getDim( deviceIn, callback ) {
	//devices.forEach(function(device){ //Loop trough all registered devices

		console.log("GetDim", deviceIn.dim);
		deviceIn.dim = deviceIn.dim;  //temp holder
		//if (active_device.group == device.group) {
			console.log("getDim callback", deviceIn.dim);
			callback( null, deviceIn.dim );
		//}
	//});
}



// Set the Dim
function setDim( deviceIn, dim, callback ) {
	
	console.log("setDim: ", dim);

	//increase dim Parameter: 11  Parameter1: 15
	// decrease dim Parameter: 10  Parameter1: 0
	var Para1 = 0;
	var Para2 = 0;
	var command =0;
	
			if (dim < 0.05) { //Totally off
				//device.bridge.sendCommands(commands.white.off(device.group));
				Para1 = 0;
				Para2 = 0;
				command = 0;
			} else if (dim > 0.95) { //Totally on
				//device.bridge.sendCommands(commands.white.maxBright(device.group));
				Para1 = 0;
				Para2 = 0;
				command = 1;
			} else {
				//var dim_dif = Math.round((dim - device.dim) * 10);
				
				var dim_new = Math.round((dim*31) );
				dim_new= dim_new + 192;
				
				console.log("dim_dif", dim_new, "last_dim", deviceIn.dim);
				//0-32 in hex,  first digit para1 second digit para2
				
				var dArray = createHexString(dim_new);
				
				Para1 = parseInt(dArray[0],16);
				Para2 = parseInt(dArray[1],16);
				command = 1;

				
			}

			var dataToSend = [ Para1, Para2, 10, command, deviceIn.transID1, deviceIn.transID2, deviceIn.transID3, deviceIn.transID4, deviceIn.transID5, 1 ];
			var frame = new Buffer(dataToSend);
	
			console.log("Data sent", dataToSend);
	
			signal.tx( frame, function( err, result ){
   				if(err != null)console.log('LWSocket: Error:', err);
			})
	
			deviceIn.dim = dim; //Set the new dim
			console.log("setState callback", deviceIn.dim);
			callback( null, deviceIn.dim ); //Callback the new dim
	

}



function createHexString(intToHexArray) {
 //   var result = [];
 
        var str = intToHexArray.toString(16);
        // Pad to two digits, truncate to last two if too long.  Again,
        // I'm not sure what your needs are for the case, you may want
        // to handle errors in some other way.
        str = str.length == 1 ? "0" + str : 
              str.length == 2 ? str :
              str.substring(str.length-2, str.length);
			  var result = [str.substring(0, 1), str.substring(1, 2)];
			  
		console.log("input String", intToHexArray );	 	  
		console.log("Hex String", str );	  
		console.log("array 1", str.substring(0, 1) );
	 	console.log("array 2", str.substring(1, 2));
	 
	 	
     	console.log("array 1", result[0] );
	 	console.log("array 2", result[1] );


    return result;
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