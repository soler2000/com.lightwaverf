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
var lastTXMessageID ='';
var standardTimeOut = 2000;
var longTimeOut =7000;

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
					
		
					signal = new Signal('lwrf');
					
						
						signal.register(function( err, success ){
							if(err != null)
								{
								console.log('LightwaveRF: err', err, 'success', success);
								}
						});
							
							
						console.log('Start listening for Lightwave Commands');
					
						//Start receiving
						signal.on('payload', function(payload, first)
							{
							//should prevent boucing, but need dim value therefore used alternative method
							 //if(!first)return;
			
							//Convert received array to usable data
							var rxData = parseRXData(payload); 
							ManageIncomingRX(self, rxData)
							
						});
					}
							
			//Refresh deviceList
			devices.forEach(function(device)
				{
				console.log('Refresh Device List TransID', device.transID, ' Driver:', device.driver, ' ID:', device.id);
				addDevice(device);
				});
				callback();
			},

			deleted: function( device_data ) 
			{
				var index = deviceList.indexOf(getDeviceById(device_data));
				delete deviceList[index];
				//console.log('LW item: Device deleted, you will need to manually remove homey from the device');
			},
		
			capabilities: {
						onoff: {
							get: function( device_data, callback ) 
								{
		
									var device = getDeviceById(device_data);
									callback( null, device.onoff );
								},
							set: function( device_data, onoff, callback ) 
								{
									var devices = getDeviceByEachTransID(device_data);
									devices.forEach(function(device){
										updateDeviceOnOff(self, device, onoff);
									});	
	
									sendOnOff(device_data, onoff);
									callback( null, onoff );
								}
							},
					dim: {
							get: function(device_data, callback )
								{
									var device = getDeviceById(device_data);				
									getDim(device_data,callback);
									Homey.log('Get dim:', device_data);
									callback( null, device_data.dim ); 
								},
	
							set: function(device_data, dim, callback )
								{
									setDim(device_data, dim, function(err, dimLevel) 
										{
											
											var device = getDeviceById(device_data);
											updateDeviceDim(self, device, dim);
										
											callback( null, dimLevel ) //New state
										});
								}	
						}, 
			},
		
		pair: function( socket ) {
			socket.on('imitate1', function( data, callback )
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
					var TransmitterSubID = 1;  //check this is the same for all
				var transID = HextoTransID(transID1, transID2, transID3, transID4, transID5);
				
				tempdata = 
					{
					address: address,
					transID    			: transID,
					transID1   			: transID1,
					transID2   			: transID2,
					transID3   			: transID3,
					transID4   			: transID4,
					transID5   			: transID5,
					TransmitterSubID	: TransmitterSubID,
					dim		   			: dim,
					onoff  	   			: true,
					}	
			
				sendOnOff(tempdata, true);
				socket.emit('datasent');
				callback();
			});
			
			socket.on('test_device', function( data, callback ){
				
				signal.on('payload', function(payload, first){
					console.log('test device - payload recieved ',displayTime());
					
					if(!first)return;
			        var rxData = parseRXData(payload);
					
				
			        if(rxData.transID == tempdata.transID){
						if(rxData.onoff){
							socket.emit('received_on'); //Send signal to frontend
						}else{
							socket.emit('received_off'); //Send signal to frontend
						}
					}
				});
				callback(null, tempdata.onoff);
			});
			
			//Testing of MoodSwitch
			socket.on('test_moodswitch', function( data, callback ){
				
				signal.on('payload', function(payload, first){
					console.log('test device - payload recieved ',displayTime());
					
					if(!first)return;
			        var rxData = parseRXData(payload);
					
				
			         if(rxData.transID == tempdata.transID){
						console.log('Para1', rxData.para1);
						console.log('Para2', rxData.para2);
						console.log('Device', rxData.device);
						console.log('Command', rxData.command);
						if(rxData.device == 15){ //in mood mode
							//P1 0 for on or 8 for off
							if(rxData.para1 == 8 && rxData.para2 == 1){
								socket.emit('received_on'); //Send signal to frontend
							}else{
								socket.emit('received_off'); //Send signal to frontend
							}					
						}else{
							//not in moood mode
							if(rxData.command == 1){
								socket.emit('received_on'); //Send signal to frontend
							}else{
								socket.emit('received_off'); //Send signal to frontend
							}			
						}
					}
				});
				callback(null, tempdata.onoff);
			});
			
			
			//Testing of PIR
			socket.on('test_device_pir', function( data, callback ){
				
				signal.on('payload', function(payload, first){
			
					if(!first)return;
			        var rxData = parseRXData(payload);
		
					
			        if(rxData.transID == tempdata.transID){
						if(rxData.command == 9){
							socket.emit('received_on'); //Send signal to frontend
						}else{
							socket.emit('received_off'); //Send signal to frontend
						}
					}
				});
				callback(null, tempdata.onoff);
			});
			
			//Testing of DoorBell
			socket.on('test_device_doorbell', function( data, callback ){
				signal.on('payload', function(payload, first){
					
					
					if(!first)return;
			        var rxData = parseRXData(payload);
					
					console.log('Test device Doorbell- payload recieved ',displayTime(), ' Comannd:', rxData.command );
					
			        if(rxData.transID == tempdata.transID){
						
						if(rxData.command == 3){
							socket.emit('received_on'); //Send signal to frontend
							setTimeout(function(){socket.emit('received_off');}, 1500);   //delay to animate the bell
							
						}else{
							
							socket.emit('received_off'); //Send signal to frontend
						}
					}
				});
				callback(null, tempdata.onoff);
			});
			
						
			//Testing of Remote
			socket.on('remote', function( data, callback )
				{
					signal.once('payload', function(payload, first)
						{
				
							if(!first)return;
						
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
								address				: address,
								transID    			: rxData.transID,
								transID1   			: rxData.transID1,
								transID2   			: rxData.transID2,
								transID3   			: rxData.transID3,
								transID4   			: rxData.transID4,
								transID5   			: rxData.transID5,
								TransmitterSubID	: rxData.TransmitterSubID,
								dim		   			: rxData.dim,
								onoff  	   			: rxData.onoff,
								}		
							console.log('Trans ID ',rxData.transID);
							socket.emit('remote_found');
							callback(null, tempdata.onoff);
						});
						
		
					
				});
				
	
			socket.on('generate', function( data, callback )
				{
					console.log('generate at ',displayTime());
					signal.on('payload', function(payload, first)
						{
							if(!first)return;
			        		var rxData = parseRXData(payload);
						
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
	
							
					callback();
				});
				
		
		socket.on('sendSignal', function( onoff, callback )
				{
					if(onoff != true){
						onoff = false;
						}
					sendOnOff(tempdata, onoff);
					var devices = getDeviceByEachTransID(tempdata);
					
					devices.forEach(function(device){
						updateDeviceOnOff(self, device, onoff)
					});	
						
					callback();
				});
						
							
		socket.on('done', function( data, callback )
				{
					console.log('emit Done at', displayTime());
					var idNumber = Math.round(Math.random() * 0xFFFF);
					var id = tempdata.address;
					var name =  __(driver); //__() Is for translation
					
					addDevice({
						id       			: id,
						//address  			: tempdata.address,
						transID   			: tempdata.transID,
						transID1   			: tempdata.transID1,
						transID2   			: tempdata.transID2,
						transID3   			: tempdata.transID3,
						transID4   			: tempdata.transID4,
						transID5   			: tempdata.transID5,
						TransmitterSubID	: tempdata.TransmitterSubID,
						dim					: 0,
						onoff    			: false,
						driver   			: driver,
						});
					
					//Share data to front end
					callback(null, 
						{
							name: name,
							data: {
								id       			: id,
								//address  			: tempdata.address,
								transID   			: tempdata.transID,
								transID1   			: tempdata.transID1,
								transID2   			: tempdata.transID2,
								transID3   			: tempdata.transID3,
								transID4   			: tempdata.transID4,
								transID5   			: tempdata.transID5,
								TransmitterSubID	: tempdata.TransmitterSubID,
								dim					: 0,
								onoff    			: false,
								driver   			: driver,
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
	
	//console.log('rxData:', rxData);
	var devices = getDeviceByEachTransID(rxData);
	
	devices.forEach(function(device){
		
		console.log('*****************Pay load received****************');
		
		if (lastTXMessageID != device.transID  && devices.length >0){
	
			console.log('New message:P1', rxData.para1, 
								' P2:',rxData.para2 ,  
								' Cmd:', rxData.command,
								' TransID RX:', rxData.transID,
								' TransID D:', device.transID,
								' unit:', rxData.unit,
								' Channel:', rxData.channel
								);


			//used in flow to see which remote was last pressed	
			LastRX = rxData;
		
		
			updateDeviceOnOff(self, device, rxData.onoff);			
			
			//device passed to flows is inccorect		
			flowselection(device, LastRX);
				
			lastTXMessageID = device.transID;
			
			
			//clears the last value after Time period
	
			var timeout;
			if(device.driver  == "lw2100"){
				//Prevents retrigger on doorbell
				timeout =longTimeOut;		//5000
			}else{
				timeout =standardTimeOut; 	//2000
			}


			
			setTimeout(function(){lastTXMessageID ='';console.log('Timeout cleared:',timeout); }, timeout);
		}else{
			//checks
			//is it a mood device,  device 15?  if so do nothing
			//is it a parameter command,  if so act
			console.log('Message rejected - inside timeout setting of Manage Incoming'); 
		}
	
		
	});
}


function getDeviceByTransID(deviceIn) {
	var matches = deviceList.filter(function(d){
		return d.transID == deviceIn.transID;
	});
	return matches ? matches[0] : null;
}
function getDeviceByEachTransID(deviceIn) {
	var matches = deviceList.filter(function(d){
		return d.transID1 == deviceIn.transID1 && 
			d.transID2 == deviceIn.transID2 && 
			d.transID3 == deviceIn.transID3 && 
			d.transID4 == deviceIn.transID4 && 
			d.transID5 == deviceIn.transID5; 
	});
	return matches ? matches : null;
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
	//console.log('Update device OnOff called', device);
	device.onoff = onoff;
	self.realtime(device, 'onoff', onoff);
}

function updateDeviceDim(self, device, dim){
	device.dim = dim;
	self.realtime(device, 'dim', dim);
}




function addDevice(deviceIn) {
	//console.log('Adding device - Device Data', deviceIn);
	
	var transID = HextoTransID(deviceIn.transID1,deviceIn.transID2, deviceIn.transID3, deviceIn.transID4, deviceIn.transID5)
	//console.log('Adding device - transID', transID);
	
	deviceList.push({
		id       			: deviceIn.id,
		transID   			: transID,
		transID1   			: deviceIn.transID1,
		transID2   			: deviceIn.transID2,
		transID3   			: deviceIn.transID3,
		transID4   			: deviceIn.transID4,
		transID5   			: deviceIn.transID5,
		TransmitterSubID	: deviceIn.TransmitterSubID,
		dim					: deviceIn.dim,
		onoff    			: deviceIn.onoff,
		driver   			: deviceIn.driver
	});	
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
	
	var p1 =0;
	var p2 =0;
	
	
	//console.log('****************Send on off*****************');
	if(device === undefined)
	{
		console.log('In send on off - the device is undefined');
	}
		
	if( onoff == false){
		
		command =0;//send off
		deviceIn.onoff = true;
		var p1 =4;
		var p2 =0; 
	}
	else if(onoff == true){
		
		command =1;//send on
		deviceIn.onoff = false;
		var p1 =0;
		var p2 =0;
	}
	
	var dataToSend = createTXarray( p1, p2, 10, command, device.transID1, device.transID2, device.transID3, device.transID4, device.transID5, 1 );
	var frame = new Buffer(dataToSend);
	
	signal.tx( frame, function( err, result ){
   		if(err != null)console.log('LWSocket: Error:', err);
	});
	
}

function sendFlash(deviceIn) {
	
	var device = clone(deviceIn);
	
	var command =0;
	var transID =0;
	var transID1 =0;
	var transID2 =0;
	var transID3 =0;
	var transID4 =0;
	var transID5 =0;
	
	
	//console.log('****************Send flash*****************');
	if(device === undefined)
	{
		console.log('In send flash - the device is undefined');
	}
		
	command =3;//Flash command	
	
	var dataToSend = createTXarray( 0, 0, 10, command, device.transID1, device.transID2, device.transID3, device.transID4, device.transID5, 1 );
	var frame = new Buffer(dataToSend);
	
	signal.tx( frame, function( err, result ){
   		if(err != null)console.log('LWSocket: Error:', err);
	});
	
}
///Dim  Section*************************************************************************************************************
// Get the Dim

// Get the Dim of a group
function getDim( active_device, callback ) {
	
	
	//active device has no dim data
	console.log('active device',active_device);
	var devices = getDeviceByEachTransID(active_device);    ///not returning device
	 devices.forEach(function(device){ //Loop trough all registered devices

			console.log('getDim callback', device.dim);
			callback( null, device.dim );
		
	});
}


// Set the Dim
function setDim( deviceIn, dim, callback ) {
	
	console.log("setDim: ", dim);
	//Device In does not contain the correct onoff value
	console.log("Device In: ", deviceIn);
	
	var deviceOnOff = getDeviceById(deviceIn);
	console.log("Device In On Off: ", deviceOnOff.onoff);
	
	
	var last_dim = deviceIn.dim;
	// increase dim Parameter: 11  Parameter1: 15
	// decrease dim Parameter: 10  Parameter1: 0
	var Para1 = 0;
	var Para2 = 0;
	var command =0;
	
		if (dim < 0.05) { //Totally off
			Para1 = 0;
			Para2 = 0;
			command = 0;
		} else if (dim > 0.95) { //Totally on
			Para1 = 0;
			Para2 = 0;
			command = 1;
		} else {			
		var dim_new = Math.round((dim*31) );
		dim_new= dim_new + 192;
				
			
		//0-32 in hex,  first digit para1 second digit para2		
		var dArray = createHexString(dim_new);
				
		Para1 = parseInt(dArray[0],16);
		Para2 = parseInt(dArray[1],16);
		command = 1;

				
	}
			
	//only fire if the dim value has changed to prevent over firing
	if ( dim_new != last_dim){
				
		var dataToSend = createTXarray( 	Para1, 
										Para2, 
										10, 
										command, 
										deviceIn.transID1, 
										deviceIn.transID2, 
										deviceIn.transID3, 
										deviceIn.transID4, 
										deviceIn.transID5, 
											1 );
		
		var frame = new Buffer(dataToSend);
			
		//Trigger to detect if lights are on or offf
		//var device = getDeviceById(device_data);
		if (deviceOnOff.onoff== true)
		{
			signal.tx( frame, function( err, result ){
   			if(err != null)console.log('LWSocket: Error:', err);
				console.log('Light on');
			})
		}
		else if(deviceOnOff.onoff == false)
		{
			console.log('Light off so dim level not transmitted');
		}
	
			
		deviceIn.dim = dim; //Set the new dim
		callback( null, deviceIn.dim ); //Callback the new dim
	
	}
}
///End Dim Section*************************************************************************************************************






///Flow Section*************************************************************************************************************


function flowselection(device,rxData){
	
	//Need to clone device and reset the following to the same values as pairing
	//dim: 0,
	//onoff: false,
	
	var fDevice = device;
	fDevice.dim =0;
	fDevice.onoff =false;
	
	
	console.log('Flow selection device', fDevice.driver);
	//console.log('Flow device RX', rxData);
	
	switch(fDevice.driver) {					
		case 'lw100':
			console.log('Flow Selection lw100');
			//console.log('Command', rxData.command);
			
			if (rxData.command == 1){    ///mood1
				console.log('Flow lw100 remoteOn');
				Homey.manager('flow').triggerDevice( 'lw100remoteOn', null, {device: fDevice}, fDevice, function(err, result){
					console.log('lw100remoteOn Flow result ', result);
					if( err ) return Homey.error( err);
				});
				
				
			}
			if (rxData.command == 0){
				console.log('Flow lw100 remoteOff');
				Homey.manager('flow').triggerDevice( 'lw100remoteOff', null, {device: fDevice}, fDevice, function(err, result){
					console.log('lw100remoteOff Flow result ', result);
					if( err ) return Homey.error( err);
				});
				
				
			}
		break;
		
		case 'lw101'://Mood switch
			console.log('Flow Selection lw101 P1: P2', rxData.para1, rxData.para2);
			
			//console.log('Command', rxData.command);
			if (rxData.para1 == 8  && rxData.para2 == 1){
				console.log('Flow lw101 lw101remoteMoodOn');
				Homey.manager('flow').triggerDevice( 'lw101remoteMoodOn', null, {device: fDevice}, fDevice, function(err, result){
					console.log('lw101remoteMoodOn Flow result ', result);
					if( err ) return Homey.error( err);
				});
			}
			if (rxData.para1 == 8  && rxData.para2 == 0){
				console.log('Flow lw101 lw101remoteMoodoff');
				Homey.manager('flow').triggerDevice( 'lw101remoteMoodoff', null, {device: fDevice}, fDevice, function(err, result){
					console.log('lw101remoteMoodoff Flow result ', result);
					if( err ) return Homey.error( err);
				});
			}
			
			if (rxData.para1 == 12  && rxData.para2 == 0){
				console.log('Flow lw101 lw101remoteAllOff');
				Homey.manager('flow').triggerDevice( 'lw101remoteAllOff', null, {device: fDevice}, fDevice, function(err, result){
					console.log('lw101remoteAllOff Flow result ', result);
					if( err ) return Homey.error( err);
				});

				
			}
			
			if (rxData.para1 == 8  && rxData.para2 == 2){
				console.log('Flow lw101 lw101remoteMood1 - Trigger');
				Homey.manager('flow').triggerDevice( 'lw101remoteMood1', null, {device: fDevice}, fDevice, function(err, result){
					console.log('lw101 remote Mood1 Flow result ', result);
					if( err ) return Homey.error( err);
				});

				
			}
			if (rxData.para1 == 8  && rxData.para2 == 3){
				console.log('Flow lw101 lw101remoteMood2');
				Homey.manager('flow').triggerDevice( 'lw101remoteMood2', null, {device: fDevice}, fDevice, function(err, result){
					console.log('lw101 remote Mood2 Flow result ', result);
					if( err ) return Homey.error( err);
				});

				
			}
			if (rxData.para1 == 8  && rxData.para2 == 4){
				console.log('Flow lw101 lw101remoteMood3');
				Homey.manager('flow').triggerDevice( 'lw101remoteMood3', null, {device: fDevice}, fDevice, function(err, result){
					console.log('lw101 remote Mood3 Flow result ', result);
					if( err ) return Homey.error( err);
				});
				
			
			}
		break;
	
		case 'lw107':
		
			console.log('lw107 case');
			console.log('Flow Command', rxData.command);
		
			if (rxData.command == 1){
				Homey.manager('flow').triggerDevice( 'lw107activate', null, {device: fDevice}, fDevice, function(err, result){
					console.log('lw107 activate Flow result ', result);
					if( err ) return Homey.error(err);
				});
				
				}
				
			if(rxData.command == 0){
				
				Homey.manager('flow').triggerDevice('lw107deactivate', null, {device: fDevice}, fDevice, function(err, result){
					console.log('lw107 deactivate Flow result ', result);
					if(err) return Homey.error(err);
				});
	
				}
		break;
		
			
		case 'lw200':
		console.log('Flow lw200');
		console.log('Flow Command', rxData.command);
			if (rxData.command == 1){
				Homey.manager('flow').triggerDevice( 'lw200remoteOn', null, {device: fDevice}, fDevice, function(err, result){
					console.log('lw200 remoteOn Flow result ', result);
					if( err ) return Homey.error( err);
				});
				

			}
			if(rxData.command == 0){
				Homey.manager('flow').triggerDevice( 'lw200remoteOff', null, {device: fDevice}, fDevice, function(err, result){
					console.log('lw200 remoteOff Flow result ', result);
					if( err ) return Homey.error( err);
				});
	
			}
		break;		
			
		case 'lw904':
			console.log('Flow selected lw904');
			console.log('Flow Command', rxData.command);
			if (rxData.command == 1){
				
				Homey.manager('flow').triggerDevice( 'lw904open', null, {device: fDevice}, fDevice, function(err, result){
					console.log('lw904 open Flow result ', result);
					if( err ) return Homey.error( err);
				});
	
			}
			if(rxData.command == 0){
	
				Homey.manager('flow').triggerDevice( 'lw904close', null, {device: fDevice}, fDevice, function(err, result){
					console.log('lw904 close Flow result ', result);
					if( err ) return Homey.error( err);
				});
	
			}
		break;	
				
		case 'lw2100':
			console.log('Flow lw2100');
			console.log('Flow Command', rxData.command);
			if (rxData.command == 3){
				Homey.manager('flow').triggerDevice( 'lw2100press', null, {device: fDevice}, fDevice, function(err, result){
					console.log('lw2100 press Flow result ', result);
					if( err ) return Homey.error( err);
				});
	
			}

		break;										
		default: 
			
	}
}


Homey.manager('flow').on('trigger.lw100remoteOn', function( callback, args, state ){
	
	console.log('lw100remoteOn fired in flow. arg: last', state.device.transID, '  ',  LastRX.transID);
		
	if(args.channel == LastRX.channel && args.unit == LastRX.unit && state.device.transID == LastRX.transID){
		console.log('Flow approved');
    	callback( null, true );   	
   }else{
		console.log('Flow canceled');
		//callback( null, false ); 
	}	 
});

Homey.manager('flow').on('trigger.lw100remoteOff', function( callback, args, state ){
	
	
		
	if(args.channel == LastRX.channel && args.unit == LastRX.unit && state.device.transID == LastRX.transID){
		console.log('lw100remoteOff fired in flow. arg:', args);
		console.log('Flow approved');
    	callback( null, true );   	
   }else{
	   	console.log('lw100remoteOff fired in flow. arg:', args);
		console.log('Flow canceled');
		callback( null, false ); 
	}	 
});









Homey.manager('flow').on('trigger.lw101remoteMoodOn', function( callback, args, state ){
	
	
		
	if(state.device.transID == LastRX.transID){
		console.log('lw101remoteMoodOn fired in flow. arg:', args);
		console.log('Flow approved');
    	callback( null, true );   	
   }else{
	   	console.log('lw101remoteMoodOn fired in flow. arg:', args);
		console.log('Flow canceled');
		callback( null, false ); 
	}	 
});
Homey.manager('flow').on('trigger.lw101remoteMoodoff', function( callback, args, state ){
	
	console.log('Flow lw101remoteMoodoff triggered');
		
	if(state.device.transID == LastRX.transID){
		console.log('lw101remoteMoodoff fired in flow. arg:', args);
		console.log('Flow approved');
    	callback( null, true );   	
   }else{
	   	console.log('lw101remoteMoodOff fired in flow. arg:', args);
		console.log('Flow canceled');
		callback( null, false ); 
	}	 
});

Homey.manager('flow').on('trigger.lw101remoteAllOff', function( callback, args, state ){
	
	if(state.device.transID == LastRX.transID){
		console.log('lw101remoteAllOff fired in flow. arg:', args);
		console.log('Flow approved');
    	callback( null, true );   	
   }else{
	   	console.log('lw101remoteAllOff fired in flow. arg:', args);
		console.log('Flow canceled');
		callback( null, false ); 
	}	 
});


Homey.manager('flow').on('trigger.lw101remoteMood1', function( callback, args, state ){
	
	
	console.log('lw101remoteMood1 fired in flow. arg:', args ,lastrx);


	if(state.device.transID == LastRX.transID){
		console.log('lw101remoteMood1 fired in flow. arg:', args);
		console.log('Flow approved');
    	callback( null, true );   	
   }else{
	   	console.log('lw101remoteMood1 fired in flow. arg:', args);
		console.log('Flow canceled');
		callback( null, false ); 
	}	 
});

Homey.manager('flow').on('trigger.lw101remoteMood2', function( callback, args, state ){
	
	
		
	if(state.device.transID == LastRX.transID){
		console.log('lw101remoteMood2 fired in flow. arg:', args);
		console.log('Flow approved');
    	callback( null, true );   	
   }else{
	   	console.log('lw101remoteMood2 fired in flow. arg:', args);
		console.log('Flow canceled');
		callback( null, false ); 
	}	 
});

Homey.manager('flow').on('trigger.lw101remoteMood3', function( callback, args, state ){
	
	
		
	if(state.device.transID == LastRX.transID){
		console.log('lw101remoteMood3 fired in flow. arg:', args);
		console.log('Flow approved');
    	callback( null, true );   	
   }else{
	   	console.log('lw101remoteMood3 fired in flow. arg:', args);
		console.log('Flow canceled');
		callback( null, false ); 
	}	 
});






Homey.manager('flow').on('trigger.lw107activate', function( callback, args, state ){
	
	if(state.device.transID == LastRX.transID) {
		console.log('lw107activate fired in flow');
		console.log('Flow approved');
	   	callback( null, true ); 
	}else{
		console.log('lw107 not fired:', args);
		console.log('Flow canceled');
		callback( null, false ); 
	}
	
	});
	

Homey.manager('flow').on('trigger.lw107deactivate', function( callback, args, state ){
	if(state.device.transID == LastRX.transID) {
		console.log('lw107deactivate fired in flow');
		console.log('Flow approved');
	   	callback( null, true );   	
		}else{
		console.log('lw107deactivate not fired:', args);
		console.log('Flow canceled');
		callback( null, false ); 
	}
	});
	
Homey.manager('flow').on('trigger.lw200remoteOn', function( callback, args, state ){
	if(state.device.transID == LastRX.transID) {
		console.log('lw200remoteOn fired in flow');
		console.log('Flow approved');
	   	callback( null, true );   	
		}else{
		console.log('lw200remoteOn not fired:', args);
		console.log('Flow canceled');
		callback( null, false );
		//Homey.manager('flow').trigger('solar_intensity', { intensity: value }); 
	}
	});
	
Homey.manager('flow').on('trigger.lw200remoteOff', function( callback, args, state ){
	if(state.device.transID == LastRX.transID) {
		console.log('lw200remoteOff fired in flow');
		console.log('Flow approved');
	   	callback( null, true );   	
		}else{
		console.log('lw200remoteOff not fired:', args);
		console.log('Flow canceled');
		callback( null, false ); 
	}
	});
	
Homey.manager('flow').on('trigger.lw904open', function( callback, args, state ){
	if(state.device.transID == LastRX.transID) {
		console.log('lw904open fired in flow');
		console.log('Flow approved');
	   	callback( null, true );   	
		}else{
		console.log('lw904open not fired:', args);
		console.log('Flow canceled');
		callback( null, false ); 
	}
	});


Homey.manager('flow').on('trigger.lw904close', function( callback, args, state ){
	if(state.device.transID == LastRX.transID) {
		console.log('lw904close fired in flow');
		console.log('Flow approved');
	   	callback( null, true );   	
		}else{
		console.log('lw904close not fired:', args);
		console.log('Flow canceled');
		callback( null, false ); 
	}
	});


Homey.manager('flow').on('trigger.lw2100press', function( callback, args, state ){
	if(state.device.transID == LastRX.transID) {
		console.log('lw2100press fired in flow');
		console.log('Flow approved');
	   	callback( null, true );   	
		}else{
		console.log('lw2100press not fired:', args);
		console.log('Flow canceled');
		callback( null, false ); 
	}
	});

Homey.manager('flow').on('action.flash_lw400', function( callback, args, state ){
	
	console.log('flash_lw400 fired in flow');
	sendFlash(state.device);
	callback( null, true ); 
	
	});

///END Flow Section*************************************************************************************************************







//not sure if temp data exits at this point
//function is not in use
function generatTransID(tempdata) {
			tempdata.transID1 = getRandomInt(0,15);
			tempdata.transID2 = getRandomInt(0,15);
			tempdata.transID3 = getRandomInt(0,15);
			tempdata.transID4 = getRandomInt(0,15);
			tempdata.transID5 = getRandomInt(0,15);	
}



///Receiver Section*************************************************************************************************************




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







function GetChannelandPage(device) {
	var channel;
	var page;
	
	
	//need channel and Unit for remote with multiple buttons
	switch(device) {
    case 0:
        page = 1;
		channel = 1;
        break;
    case 1:
        page = 2;
		channel = 1;
        break;
	case 2:
        page = 3;
		channel = 1;
        break;
	case 3:
        page = 4;
		channel = 1;
        break;
	case 4:
        page = 1;
		channel = 2;
        break;
	case 5:
        page = 2;
		channel = 2;
        break;
	case 6:
        page = 3;
		channel = 2;
        break;
	case 7:
        page = 4;
		channel = 2;
        break;
	case 8:
        page = 1;
		channel = 3;
        break;
	case 9:
        page = 2;
		channel = 3;
        break;
	case 10:
        page = 3;
		channel = 3;
        break;
	case 11:
        page = 4;
		channel = 3;
        break;
	case 12:
        page = 1;
		channel = 4;
        break;
	case 13:
        page = 2;
		channel = 4;
        break;
	case 14:
        page = 3;
		channel = 4;
        break;
	case 15:
        page = 4;
		channel = 4;
        break;

    default: 
		page = 5;
		channel = 5;
}
var Devarr= [channel, page];
return Devarr;
}


function convertItoH(integer) {
    var str = Number(integer).toString(16);
    return str.length == 1 ? "0" + str : str;
};

function HextoTransID(transId1,transId2, transId3, transId4, transId5){
	
	
	var t1 = convertItoH(transId1).substring(1,2);
	var t2 = convertItoH(transId2).substring(1,2);
	var t3 = convertItoH(transId3).substring(1,2);
	var t4 = convertItoH(transId4).substring(1,2);
	var t5 = convertItoH(transId5).substring(1,2);
	
	
    var trans = t1 + t2 + t3 + t4 + t5;
	return trans;
}


//Used as a look up array for the possible words transmitted by lightwaveRF
var transcodes = [
				 '11110110',
   	 			 '11101110',
   			 	 '11101101',
    			 '11101011',
    			 '11011110',
    			 '11011101',
    			 '11011011',
				 '10111110',
				 '10111101',
				 '10111011',   
				 '10110111',  
				 '01111110',   
				 '01111101',    	
				 '01111011',       	
				 '01110111',
				 '01101111']




function parseMessage(data,startpoint){
	
	
	//could do a check to ensure numbers add up to 6
	
	var msg = data[startpoint].toString();
	msg = msg + data[startpoint+1].toString();
	msg = msg + data[startpoint+2].toString();
	msg = msg + data[startpoint+3].toString();
	msg = msg + data[startpoint+4].toString();
	msg = msg + data[startpoint+5].toString();
	msg = msg + data[startpoint+6].toString();
	msg = msg + data[startpoint+7].toString();		
    var msgI = transcodes.indexOf(msg);
	

return msgI;

}

function createTXarray(Para1,Para2,Device,command, TransID1, TransID2, TransID3, TransID4, TransID5, SubID){

		//add Para1
		
		var txSignal =[1];
		//txSignal.push(1);
		var str;
		str = transcodes[parseInt(Para1,10)];
		//str = transcodes[0];

		for (var i = 0, len = str.length; i < len; i++) {
  			txSignal.push(str[i]);
		}
		
		
		
		txSignal.push(1);
		str = transcodes[parseInt(Para2,10)];
		for (var i = 0, len = str.length; i < len; i++) {
  			txSignal.push(str[i]);
		}
		
		txSignal.push(1);	
		str = transcodes[parseInt(Device,10)];
		for (var i = 0, len = str.length; i < len; i++) {
  			txSignal.push(str[i]);
		}
		
		txSignal.push(1);		
		str = transcodes[parseInt(command,10)];
		for (var i = 0, len = str.length; i < len; i++) {
  			txSignal.push(str[i]);
		}
		
		txSignal.push(1);		
		str = transcodes[parseInt(TransID1,10)];
		for (var i = 0, len = str.length; i < len; i++) {
  			txSignal.push(str[i]);
		}
		
		txSignal.push(1);		
		str = transcodes[parseInt(TransID2,10)];
		for (var i = 0, len = str.length; i < len; i++) {
  			txSignal.push(str[i]);
		}
		
		txSignal.push(1);		
		str = transcodes[parseInt(TransID3,10)];
		for (var i = 0, len = str.length; i < len; i++) {
  			txSignal.push(str[i]);
		}
		
		txSignal.push(1);		
		str = transcodes[parseInt(TransID4,10)];
		for (var i = 0, len = str.length; i < len; i++) {
  			txSignal.push(str[i]);
		}
				
		txSignal.push(1);	
		str = transcodes[parseInt(TransID5,10)];
		for (var i = 0, len = str.length; i < len; i++) {
  			txSignal.push(str[i]);
		}
		txSignal.push(1);		
		str = transcodes[parseInt(SubID,10)];
		for (var i = 0, len = str.length; i < len; i++) {
  			txSignal.push(str[i]);
		}
		
	return txSignal;		
	}


function parseRXData(data) {


	//console.log('Parse data', data);// too long to show

	
	if (data != undefined) {
		
		
		//Data format,
		
		//First bit always hould be a 1 for start of frame
		
		if (data[0] !=1){
			console.log('incorrect First bit', data[0]);
			return { 
				para1 				: 0,
				para2 				: 0,
				device				: 0,
				transID				: 0,
				transID1 			: 0,
				transID2 			: 0,
				transID3 			: 0,
				transID4 			: 0,
				transID5 			: 0,
				TransmitterSubID  	: 0,
				device   			: 0,
				channel				: 0,
				unit				: 0,
				command  			: 0,
				onoff    			: false
			};
		}else{
			
	
			var para1 = parseMessage(data,1);	
		
			var para2 = parseMessage(data,10);	
		
			var device = parseMessage(data,19);	
		
			var command = parseMessage(data,28);	
	
			var TransmitterID = HextoTransID(parseMessage(data,37), 
											parseMessage(data,46),
											parseMessage(data,55),
											parseMessage(data,64),
											parseMessage(data,73));
			
			
			var TransmitterSubID = parseMessage(data,82);
			//var TransIDArray = createTransIDtoInt(TransmitterID);
			var Devarr = GetChannelandPage(device);
		
			if(command == "1"){
				//Turn On
				onoff = true;
			}else{
				//Turn Off
				onoff = false;
			}
			
			
			console.log('Parse RX Trans ID:', TransmitterID ,' Para1:',para1,' Para2:',para2,' Command:',command);
			
			return { 
				para1 				: para1,
				para2 				: para2,
				device				: device,
				transID				: TransmitterID,
			 	transID1 			: parseMessage(data,37),
			 	transID2 			: parseMessage(data,46),
			 	transID3 			: parseMessage(data,55),
			 	transID4 			: parseMessage(data,64),
			 	transID5 			: parseMessage(data,73),
				TransmitterSubID  	: TransmitterSubID,
				channel				: Devarr[0].toString(),
				unit				: Devarr[1].toString(),
				command  			: command,
				onoff    			: onoff
			};
	
		}
	}
}



///TransID Section*************************************************************************************************************
function createTransIDtoInt(Hexs) {
	   console.log("input Hex String", Hexs );	
	   var ns = Hexs.tostring();
	   
	   if (ns.length ==5){
       	var trans1 = Hexs.substring(0,1).tostring();
	   	trans1 =parseInt("0x" + trans1,16);
	   	var trans2 = Hexs.substring(1,2).tostring();
	   	trans2 =parseInt("0x" + trans2,16);
	   	var trans3 = Hexs.substring(2,3).tostring();
	   	trans3 =parseInt("0x" + trans3,16);
	   	var trans4 = Hexs.substring(3,4).tostring();
	   	trans4 =parseInt("0x" + trans4,16);   
       	var trans5 = Hexs.substring(4,5).tostring();
	   	trans5 =parseInt("0x" + trans5,16);
	   
	   	var result = [trans1, trans2, trans3, trans4, trans5];
	   	}
	   else
	   	{
		   var result = [];
	   	}
	   
	
		console.log("Int array", result );	  
		

    return result;
}

function createHexString(intToHexArray) {
 
        var str = intToHexArray.toString(16);

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

///TransID Section*************************************************************************************************************




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