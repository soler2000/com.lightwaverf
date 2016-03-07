var clone = require('clone');
var deviceList = [];
var tempdata = {};
var LastRX = {};
var signal;
var initFlag = 1;
var pauseSpeed 	= 500;
var lastMessage = '';
var timeoutPeriod =500;
var incomingtimeoutflag = true;
var inmessageQ = [];
var incomingQueTimer;
var lastTXMessageID;
var TuneCount =0;

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
					var short =375;	//orginal 293	14-15 samples at 48khz				
					var long =650;	//orginal 280  14-15 samples at 48khz
					signal = new Signal(
						{   
						sof: [short,short,long,long,short,short,long,short,long,short,long,short,long,long,short,long], //Start of frame, probably includes device coding,  however I do not have enough devices to decode
   						eof: [], //no end of frame
						words: [
							[short,short,long,short,		long,short,long,long,	short],//done   West Minster
							[short,short,long,short,		long,long,short,long,	short],//done   Ding Dong
							[short,short,short,short,	short,short,long,long,	short],//done 	Tubular Up
							[short,long,long,long,		long,short,long,long,	short],//done  	Tubular Down
							[short,long,short,long,		short,short,long,long,	short],//done	Piano 1
							[short,long,short,long,		short,long,short,short,	long],//done   Piano 2
							[short,short,long,long,		short,long,short,short,	long],//done	Guitar
							[short,short,long,short,		long,long,short,short,	long]//done  	Bell
							
							],
						interval: 6050, 	//Time between repetitions,  this is the time between the a complete message and the start of the next
						repetitions: 100, //   total 150    	
						//This is the trigger count for detecting a signal,, this may also be the number of times a transmition takes place
						sensitivity: 0.8, 
						minimalLength: 1,
                    	maximalLength: 1
						});
					
						
						signal.register(function( err, success ){
							if(err != null)
								{
								console.log('LightwaveRF Doorbell: err', err, 'success', success);
								}
						});
							
							
						console.log('Start listening for Lightwave Door Bell Commands');
					
						//Start receiving
						signal.on('payload', function(payload, first)
							{
							//should prevent boucing, but need dim value therefore used alternative method
							 //if(!first)return;
			
							//Convert received array to usable data
							var rxData = parseRXData(payload); 
							
							//console.log('RXdata at first point of recieve:', rxData);
							
							ManageIncomingRX(self, rxData)
							
						});
					}
							
			//Refresh deviceList
			devices.forEach(function(device)
				{
				console.log('Refresh Device List - Driver:', device.driver);
				addDevice(device);
				});
				callback();
			},//end if init
		

			deleted: function( device_data ) 
			{
				var index = deviceList.indexOf(getDeviceById(device_data));
				delete deviceList[index];
				//console.log('LW item: Device deleted, you will need to manually remove homey from the device');
			},//end of deleted
		
		
//alarm generic shoulld be on button , not bell		
//			capabilities: {
//						alarm_generic: {
//							get: function( device_data, callback ) 
//								{
//									//console.log('capabilities get onoff');
//									var device = getDeviceById(device_data);
//									callback( null, device.onoff );
//								},
//							set: function( device_data, onoff, callback ) 
//								{
//									///console.log('Setting device');
//							
//									var devices = getDeviceById(device_data);
//									
//									//devices.forEach(function(device){
//									//	updateDeviceOnOff(self, device, onoff);
//									//});	
//	
//									sendOnOff(device_data, onoff);
//									callback( null, onoff );
//								}
//						}		
//		}
//	
		
		pair: function( socket ) {
			//console.log('pair socket at ',displayTime());
			//This is the first call to set temp data for a socket
			socket.on('imitate1', function( data, callback )
				{
					//console.log('imitate1 at ',displayTime());
					var address = [];
					for(var i = 0; i < 20; i++)
						{
							address.push(Math.round(Math.random()));
						}	
					address = bitArrayToString(address);
					console.log('pair about to add');
				
				//temp
				var tune = 0;
				
				tempdata = 
					{
					address: address,
					tune    	: tune,
					onoff  	   	: true,
					}	
				//console.log('Data in Tempdata',tempdata);
			
				sendOnOff(tempdata, true);
				socket.emit('datasent');
				callback();
			});
			
	
			///????????
			//This is continuing to run after the pairing is closed
			///????????
			
			//Testing of Remote
			socket.on('test_device', function( data, callback ){
				
				signal.on('payload', function(payload, first){
					console.log('test device - payload recieved ',displayTime());
					
					if(!first)return;
			        var rxData = parseRXData(payload);	
			 		// no id statement yet unless cab decode further
					socket.emit('received_on'); //Send signal to frontend	
					
				});
				callback(null, tempdata.onoff);
			});
			
			
			//Testing of Remote
			socket.on('test_device_pir', function( data, callback ){
				//console.log('test device pir at ',displayTime());
				signal.on('payload', function(payload, first){
					//console.log('test device pir- payload recieved ',displayTime());
					
					if(!first)return;
			        var rxData = parseRXData(payload);
					
					//console.log('rxData.transID',rxData.transID);
					//console.log('tempdata.transID)',tempdata.transID);
					
					
			    	//No id statement yet unless cab decode further
					socket.emit('received_on'); //Send signal to frontend
					
				
				});
				callback(null, tempdata.onoff);
			});
			
			
			
			
						
			//Testing of Remote
			socket.on('remote', function( data, callback )
				{
				//console.log('remote socket at ',displayTime());
					signal.once('payload', function(payload, first)
						{
							//console.log('remote payload at ',displayTime());
							if(!first)return;
							//console.log('Remote Detected at ',displayTime());
							
							
			        		var rxData = parseRXData(payload);
							
							//added for remote
							var address = [];
							for(var i = 0; i < 20; i++)
								{
									address.push(Math.round(Math.random()));
								}	
							address = bitArrayToString(address);
							
							tempdata = 
								{
								address		: address,
								tune    	: tune,
								onoff  	   	: rxData.onoff,
								}		
							
							console.log('Temp Data stored at',displayTime());
							socket.emit('remote_found');
							callback(null, tempdata.onoff);
						});
						
		
					
				});
				
							
			//Testing of remote	
			socket.on('generate', function( data, callback )
				{
					//console.log('generate at ',displayTime());
					signal.on('payload', function(payload, first)
						{
							
							//console.log('generate payload at ',displayTime());
							if(!first)return;
			        		var rxData = parseRXData(payload);
							
							//console.log('tempdata', tempdata);
							
			       			if(rxData.address == tempdata.address ){
							if(rxData.onoff){
								socket.emit('received_on'); //Send signal to frontend
								}else{
								socket.emit('received_off'); //Send signal to frontend
							}
							}
						});
				
					callback(null, tempdata.onoff);
				});// end of socket on
				
		socket.on('saveRemote', function( onoff, callback )
				{
					console.log('SaveRemote at ',displayTime());	
					console.log('No action is taken just flipping of the switch');		
					///added for remote end
					//console.log('tempdata', tempdata);
							
					callback();
				});
				
		//Sending Test Data to Socket or Light		
		socket.on('sendSignal', function( onoff, callback )
				{
					//console.log('SendSignal at ',displayTime());
					if(onoff != true){
						onoff = false;
						}
					sendOnOff(tempdata, onoff);
					var devices = getDeviceById(tempdata);
					
					//devices.forEach(function(device){
						updateDeviceOnOff(self, tempdata, onoff)
					//});	
						
					callback();
				});
				
		socket.on('remote_done', function( data, callback )
				{
					//console.log('Remote Done at ',displayTime());
				});
				
				
							
		socket.on('done', function( data, callback )
				{
					console.log('emit Done at', displayTime());
					var idNumber = Math.round(Math.random() * 0xFFFF);
					var id = tempdata.address;
					var name =  __(driver); //__() Is for translation
					//console.log('adding device in socket on');
					
				
					addDevice({
						id       	: id,
						address  	: tempdata.address,
						tune   		: tempdata.tune,
						onoff    	: false,
						driver   	: driver,
						});
					//console.log('LWSocket: Added device: ID',id);
				
					//Share data to front end
					callback(null, 
						{
							name: name,
							data: {
								id       	: id,
								address  	: tempdata.address,
								tune   		: tempdata.tune,
								onoff    	: false,
								driver   	: driver,
								}
						});
				});
		},
	};
	return self;
}





function ManageIncomingRX(self, rxData){
	// if message was the same no action
	// if not the action
	
	
	var devices = getDeviceByTune(rxData);
	
	/*
	//console.log('Devices Found:', devices.length);
	devices.forEach(function(device){
		
		console.log('*****************Pay load received****************');
		console.log(displayTime());
	
		//
		//console.log('transID rxdata:', rxData.transID);
		//console.log('transID device:', device.transID);
		
		if (lastTXMessageID != device.address){
			//Homey.log('New message, taking action');	
			console.log('New message');			
			LastRX = rxData;

			updateDeviceOnOff(self, device, rxData.onoff);					
			flowselection(device, LastRX);
				
			lastTXMessageID = device.address;
					
			//clears the last value after 2 seconds
			setTimeout(function(){lastTXMessageID =''; }, 2000);
		}
		
	});*/
}


	






 function callfromreemotesetup()// does it need a call back
{
	//console.log('callfromreemotesetup Done');
	}
	
	
function getDeviceById(deviceIn) {
	var matches = deviceList.filter(function(d){
		return d.id == deviceIn.id;
	});
	return matches ? matches[0] : null;
}

function getDeviceByTune(deviceIn) {
	var matches = deviceList.filter(function(d){
		return d.tune == deviceIn.tune;
	});
	return matches ? matches[0] : null;
}

function getDeviceByAddress(deviceIn) {
	var matches = deviceList.filter(function(d){
		return d.address == deviceIn.address; 
	});
	return matches ? matches : null;
}

function updateDeviceOnOff(self, device, onoff){
	//console.log('Update device OnOff called', device);
	device.onoff = onoff;
	self.realtime(device, 'onoff', onoff);
}



function addDevice(deviceIn) {
	//console.log('Adding device - Device Data', deviceIn);
	
	deviceList.push({
		id       			: deviceIn.id,
		onoff    			: deviceIn.onoff,
		driver   			: deviceIn.driver
	});	
}

function sendOnOff(deviceIn, onoff) {
	
	var device = clone(deviceIn);
	console.log('Sending onoff from doorbel');
	//Consider the transmitter iD to be unique to every device so as not to run out of devices
	//TransmitterID  = is generated a unique vale at pairing
	//device set to 1
	//SUB ID set to 1
	
	
	
	
	///testing only
	TuneCount = TuneCount +1;
	
	if(TuneCount ==7){ 
		TuneCount =0;
	}
	
	
	var tune = TuneCount;//deviceIn.tune;
	
	
	//console.log('****************Send on off*****************');
	if(device === undefined)
	{
		console.log('In send on off the doorbell device is undefined');
	}
	//console.log('device ID', device.id);
	//console.log('Send On / Off, device:',device);
	
	
	var dataToSend = [tune];
	var frame = new Buffer(dataToSend);
	
	console.log('Data to Send', dataToSend);
	
	signal.tx( frame, function( err, result ){
   		if(err != null)console.log('LWSocket: Error:', err);
	});
	
		//need to make this work to send data back,  call back is in capabilities
		//callback( null, deviceIn.onoff ); //Callback the new dim
}







///Flow Section*************************************************************************************************************

//function flowselection(device,rxData){
//	console.log('Flow device Device', device);
//	console.log('Flow device RX', rxData);
//	
//	switch(device.driver) {					
//		case 'lw2101':
//			console.log('Flow Selection lw2101');
//	
//				Homey.manager('flow').trigger('Choose_tune');			
//		break;
//												
//		default: 
//			
//	}
//}
var timeout = 3200;  //3.2 seonds to send all message
var lastfired = 0 ;

Homey.manager('flow').on('action.Choose_tune', function( callback, args ){
	
	console.log('Choose_tune fired in flow. args:', args);
	var devices = getDeviceByAddress(args.device.address );
	var dataToSend = args.tune;
	
	//Sends to all devices as currently no clear pairing method.

	var frame = new Buffer(dataToSend);
	//Prevents double firing and causing hang
	if (TimeDiff(lastfired)>timeout){
		lastfired = Date.now();
		signal.tx( frame, function( err, result ){
   		if(err != null)console.log('LWSocket: Error:', err);
			
		});	
		console.log('about to fire call back');
		
		//Add delay to sending the callback to prevent other calls during the transmission
		setTimeout(function(){ callback( null, true ); ; }, timeout);
		  
		console.log('fired call back');
	}
});

function TimeDiff(LastTime){
	
	var now = (new Date()).getTime();
	var diff = now - LastTime;//diff should be in milis

return diff;
}

///END Flow Section*************************************************************************************************************


///Receiver Section*************************************************************************************************************
function parseRXData(data) {


	console.log('Parse data', data);

	if (data != undefined) {
		var tune = data[0];
		var onoff = 0;
	return { 
		tune 				: tune,
		onoff    			: onoff
	};
}}


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

function displayTime() {
    var str = "";

    var currentTime = new Date()
    var hours = currentTime.getHours()
    var minutes = currentTime.getMinutes()
    var seconds = currentTime.getSeconds()

    if (minutes < 10) {
        minutes = "0" + minutes
    }
    if (seconds < 10) {
        seconds = "0" + seconds
    }
    str += hours + ":" + minutes + ":" + seconds + " ";
    if(hours > 11){
        str += "PM"
    } else {
        str += "AM"
    }
    return str;
}

module.exports = {
	createDriver: createDriver
};