const os = require('os');
const net = require('network');
const express = require('express');
const bcrypt = require('bcrypt');
const exec = require('child_process').exec;
const { isLoggedIn, isNotLoggedIn } = require('./middlewares');

const mailer = require('./mail');

const request = require('request');

const User = require('../models/user');
const Device = require('../models/device');

const Stream = require('node-rtsp-stream');

const router = express.Router();

let CommMethod = '';
let IPAddress = '';
let SubnetMask = '';
let Gateway = '';
const interfaces = os.networkInterfaces();
// console.log(interfaces);
for (let devName in interfaces) {
	let iface = interfaces[devName];
	for (let i = 0; i < iface.length; i++) {
		let alias = iface[i];
		if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
			IPAddress = alias.address;
			SubnetMask = alias.netmask;
		}
	}
}

const NetCmd = 'ip r | head -1';
const NetProcess = exec(NetCmd);
	
NetProcess.stdout.on('data', function (data) {
	// console.log(data);	// Debug
	const word = data.split(' ');
	
	if(word[6] == 'dhcp') {
		CommMethod = 'DHCP'
	} else {
		CommMethod = 'Static'
	}

	
	Gateway = word[2];

	// console.log('Net Method  : ', CommMethod);	// Debug
	// console.log('Net IP      : ', IPAddress);		// Debug
	// console.log('Net Subnet  : ', SubnetMask);	// Debug
	// console.log('Net Gateway : ', Gateway);			// Debug
})


let runStatus = 0;
let stream = null;

router.use((req, res, next) => {
	res.locals.user = req.user;
	next();
});

// GET / Router
router.get('/', async (req, res) => {
	try{
		// Admin User ID 자동 생성
		const userId = 'admin';
		const userName = 'Admin';
		const password = '1234';

		// admin ID Search
		const exUser = await User.findOne({ where: { userId } });
		
		// admin ID가 존재하지 않으면 생성
		if(!exUser){
			const hash = await bcrypt.hash(password, 12); // 12 : password -> hash로 변환할 때 얼마나 복잡하게 할 것인지
			// Admin User ID 자동 생성
			await User.create({
				userId,
				userName,
				password: hash,
				pwforget: false,
			});
		}
		
		const myDev = await Device.findAll({});

		let selectID = 0;
		for(let pos = 0; pos < myDev.length; ++pos){
			// console.log(myDev[pos].deviceStatus);	// Debug
			if(myDev[pos].deviceStatus == 'Run' || myDev[pos].deviceStatus == 'Loading...'){
				selectID = myDev[pos].id;
			}
		}

		if(selectID == 0) selectID = 1;

		res.render('index', {
			title: 'Atelier Capture',
			dev: myDev,
			ip: IPAddress,
			sel: selectID,
		})

		// const myDev = await Device.findAll({});
		// res.render('devices', {
		// 	title: 'Atelier Capture - Devices',
		// 	dev: myDev,
		// })
		
	} catch(err) {
		console.error(err);
		next(err);
	}
});

// GET /join Router
/*
router.get('/join', isNotLoggedIn, (req, res) => {
	try{
		res.render('join', {
			title: 'Atelier Capture - Join',
		})
	} catch(err) {
		console.error(err);
		next(err);
	}
});
*/

// GET /monitoring Router
router.get('/monitoring', isLoggedIn, (req, res) => {
	try{
		// IP 정보 얻기
		// let IPAddress = '';
		// // let IPAddress = os.networkInterfaces().eth0[0].address;
		// const interfaces = os.networkInterfaces();
		// for (let devName in interfaces) {
		// 	let iface = interfaces[devName];
		// 	for (let i = 0; i < iface.length; i++) {
		// 		let alias = iface[i];
		// 		if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
		// 			IPAddress = alias.address;
		// 		}
		// 	}
		// }
		// console.log(IPAddress);

		res.render('monitoring', {
			title: 'Atelier Capture - Monitoring',
			ip: IPAddress,
		});
		// obj = {'url': 'rtsp://192.168.10.128:8554/maskcam', 'port': 9999, 'stream': null};
		// rtsp.stream.mpeg1Muxer.on(obj);

	} catch(err) {
		console.error(err);
		next(err);
	}
});

// GET /devices Router
router.get('/devices', isLoggedIn, async (req, res, next) => {
	try{
		const myDev = await Device.findAll({
			//attributes: ['id', 'deviceDesc', 'deviceStatus', 'cameraAdd', 'detectionModel'],
			//order:[['id', 'DESC']],
		});

		//console.log(myDev);
		// for(i = 0; i<myDev.length; ++i){
		// 	console.log('ID: ' + myDev[i].id + "    Status: " + myDev[i].deviceStatus);
		// }

		let selectID = 0;
		for(let pos = 0; pos < myDev.length; ++pos){
			// console.log(myDev[pos].deviceStatus);	// Debug
			if(myDev[pos].deviceStatus == 'Run' || myDev[pos].deviceStatus == 'Loading...'){
				selectID = myDev[pos].id;
			}
		}

		if(selectID == 0) selectID = 1;

		res.render('devices', {
			title: 'Atelier Capture - Devices',
			dev: myDev,
			ip: IPAddress,
			sel: selectID,
			// devStatus: runStatus,
		})
	} catch(err) {
		console.error(err);
		next(err);
	}
});


// Post /devices Router
router.post('/devices/add', isLoggedIn, async (req, res, next) => {
	// const { devName, devType, devAdd, camAdd, storageAdd, model, filter, alarmEnable, day, startTime, endTime } = req.body;
	try{
		//console.log(req.body);
		const stringData = JSON.stringify(req.body);	// Object Data => String Dat
		// console.log(stringData);

		const jsonData = JSON.parse(stringData);	// String Data => JSON 
		console.log(jsonData);
		
		// let alarm;
		// if(jsonData.alarmEnable == 'on') alarm = true;
		// else alarm = false;

		let dModel = '';
		if(jsonData.model == 'Default'){
			dModel = 'SHInc-Default';
		} else if(jsonData.model == 'Mask'){
			dModel = 'SHInc-MaskCam';
		} else if(jsonData.model == 'PPE'){
			dModel = 'SHInc-PPECam';
		}


		await Device.create({
			deviceDesc: jsonData.devDesc,
			deviceStatus: 'Stop',
      rtspAdd: 'rtsp://' + IPAddress + ':8554/'+ dModel,
			cameraAdd: jsonData.camAdd,
			detectionModel: jsonData.model,
			owner: jsonData.devOwner,
		// 	deviceName: jsonData.devName,
		// 	deviceType: jsonData.devType,
		// 	deviceAdd: jsonData.devAdd,
		// 	cameraAdd: jsonData.camAdd,
		// 	storageAdd: jsonData.storageAdd,
		// 	detectionModel: jsonData.model,
		// 	filter: jsonData.filter,
		// 	alarmSend: alarm,
		// 	alarmDay: jsonData.day,
		// 	alarmStartTime: jsonData.startTime,
		// 	alarmEndTime: jsonData.endTime,
		// 	// owner: jsonData.owner,
		});

		
		res.redirect('/devices');
	} catch(err) {
		console.error(err);
		next(err);
	}
});

router.post('/devices/del', isLoggedIn, async (req, res, next) => {
	let index = 0;
	try{
		const stringData = JSON.stringify(req.body);	// Object Data => String Dat
		const jsonData = JSON.parse(stringData);	// String Data => JSON 
		const len = Object.keys(jsonData).length;
		

		if(!len == 0){
			const myDev = await Device.findAll({});
			// console.log(Object.keys(jsonData));

			await Device.destroy({
				truncate: true
			});

			for(let i = 0; i < myDev.length; ++i){
				
				if(myDev[i].id == (Object.keys(jsonData)[index])){
					index++;
					// console.log(index);
					// console.log(myDev[i].deviceStatus); 
					if(myDev[i].deviceStatus == 'Loading...' || myDev[i].deviceStatus == 'Run'){
						if(stream != null){
							stream.stop();
						}
					}
					continue;
				}

				await Device.create({
					deviceDesc: myDev[i].deviceDesc,
					deviceStatus: myDev[i].deviceStatus,
					cameraAdd: myDev[i].cameraAdd,
					detectionModel: myDev[i].detectionModel,
					owner: myDev[i].owner,
				});
			}
		}
		
		res.redirect('/devices');
	} catch(err) {
		console.error(err);
		next(err);
	}
});

router.post('/devices/edit', isLoggedIn, async (req, res, next) => {
	try{
		const stringData = JSON.stringify(req.body);	// Object Data => String Dat
		const jsonData = JSON.parse(stringData);	// String Data => JSON
		// console.log(jsonData);


		if(jsonData.status == 'Loading...' || jsonData.status == 'Run'){

			request.post({
				headers: { 
					'content-type': 'application/json', 
				},
				url:'http://' + IPAddress + ':8787/stop',
				body:'{}'
				}, function(error, response, body) {
					console.log(body);
			});

			await Device.update(
				{deviceStatus: 'Stop'},
				{where:{id:jsonData.editID}}
			);

			if(stream != null) {
				stream.stop();
			}
		}

		let dModel = '';
		if(jsonData.editModel == 'Default'){
			dModel = 'SHInc-Default';
		} else if(jsonData.editModel == 'Mask'){
			dModel = 'SHInc-MaskCam';
		} else if(jsonData.editModel == 'PPE'){
			dModel = 'SHInc-PPECam';
		}


		await Device.update(
			{
				deviceDesc:jsonData.editDesc, 
				rtspAdd: 'rtsp://' + IPAddress + ':8554/'+ dModel,
				cameraAdd:jsonData.editCamAdd, 
				detectionModel:jsonData.editModel
			},
			{where:{id:jsonData.editID}}
		);
		
		res.redirect('/devices');
	} catch(err) {
		console.error(err);
		next(err);
	}
});

router.post('/devices', isLoggedIn, async (req, res, next) => {
	try{
		// console.log(req.body);
		const stringData = JSON.stringify(req.body);	// Object Data => String Dat
		const jsonData = JSON.parse(stringData);	// String Data => JSON 
		// console.log(jsonData);

		// Node-RTSP-Stream Stop
		// console.log(stream);
		if(stream != null) {
			stream.stop();
		}

		// IP 정보 얻기
		// let IPAddress = '';
		// let IPAddress = os.networkInterfaces().eth0[0].address;
		// const interfaces = os.networkInterfaces();
		// for (let devName in interfaces) {
		// 	let iface = interfaces[devName];
		// 	for (let i = 0; i < iface.length; i++) {
		// 		let alias = iface[i];
		// 		if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
		// 			IPAddress = alias.address;
		// 		}
		// 	}
		// }
		// console.log(IPAddress);	// Debug

		// request.post({
		// 	headers: { 
		// 		'content-type': 'application/json', 
		// 	},
		// 	url:'http://' + IPAddress + ':8787/stop',
		// 	body:'{}'
		// 	}, function(error, response, body) {
		// 		// console.log(body);
		// });

		// Device Status Change
		if(runStatus != 0){
			runStatus = 0;
			const myDev = await Device.findAll({});
			console.log(myDev.length);
			for(let i = 0; i < myDev.length; ++i){
				// console.log(myDev[i].deviceStatus);	// Debug
				await Device.update(
				{deviceStatus: 'Stop'},
				
				{where:{id:myDev[i].id}}
				);
			}
		}

		if(runStatus == 0){
			runStatus = 1;
			await Device.update(
				{deviceStatus: 'Loading...'},
				{where:{id:jsonData.devID}}
			);
		}
		
		request.post({
			headers: { 
				'content-type': 'application/json', 
			},
			url:'http://' + IPAddress + ':8787/start',
			body:'{"ID":"' + jsonData.devID + '", "camAdd":"' + jsonData.camAdd + '", "model":"' + jsonData.model + '"}'
			}, function(error, response, body) {
				// console.log(body);
		});
		
		
		res.redirect('/devices');

	} catch(err) {
		console.error(err);
		next(err);
	}
});

router.post('/devices/runupdate', async (req, res, next) => {
	try{
		// console.log(req.body); 
		const stringData = JSON.stringify(req.body);	// Object Data => String Dat
		const jsonData = JSON.parse(stringData);	// String Data => JSON 
		// console.log(jsonData);

		const myDev = await Device.findAll({});
		let devID = null;
		// console.log(myDev.length);
		for(i = 0; i<myDev.length; ++i){
			// console.log(myDev[i].id + " : " + myDev[i].deviceStatus);
			if(myDev[i].deviceStatus == 'Loading...'){
				devID = myDev[i].id;
				await Device.update(
					{deviceStatus: 'Run'},
					{where:{id:devID}}
				);
			}
		}		

		runStatus = 2;
		stream = new Stream({
			name: 'name',
			streamUrl: jsonData.rtsp,
			// streamUrl: 'rtsp://admin:1234qwer@192.168.10.118',
			wsPort: 9999,
			ffmpegOption: {
				'-stats':'',
				'-r':30
			}
		});
		res.sendStatus(200);
	} catch(err) {
		console.error(err);
		next(err);
	}
});

router.post('/devices/stop', isLoggedIn, async (req, res, next) => {
	try{
		// let cmd;
		// let process;
		// console.log(req.body);
		const stringData = JSON.stringify(req.body);	// Object Data => String Dat
		const jsonData = JSON.parse(stringData);	// String Data => JSON 
		// console.log(jsonData);
		
		runStatus = 0;

		// Node-RTSP-Stream Stop
		if(stream != null) {
			stream.stop();
		}

		request.post({
			headers: { 
				'content-type': 'application/json', 
			},
			url:'http://' + IPAddress + ':8787/stop',
			body:'{}'
			}, function(error, response, body) {
				console.log(body);
		});

		await Device.update(
			{deviceStatus: 'Stop'},
			{where:{id:jsonData.devID}}
		);
		
		res.redirect('/devices');
	} catch(err) {
		console.error(err);
		next(err);
	}
});

// GET /settings Router
router.get('/settings', isLoggedIn, (req, res, next) => {
	try{
		res.render('settings', {
			title: 'Atelier Capture - Settings',
			netmethod : CommMethod,
			ip : IPAddress,
			sub : SubnetMask,
			gw : Gateway,
		})
	} catch(err) {
		console.error(err);
		next(err);
	}
});

router.post('/settings/netchange', isLoggedIn, async (req, res, next) => {
	try{
		// console.log(req.body);
		const stringData = JSON.stringify(req.body);	// Object Data => String Dat
		const jsonData = JSON.parse(stringData);	// String Data => JSON 
		// console.log(jsonData);

		if(jsonData.comm_method == 'DHCP') {
			request.post({
				headers: { 
					'content-type': 'application/json', 
				},
				url:'http://' + IPAddress + ':8787/netset',
				body:'{"method":"' + jsonData.comm_method + '"}'
				}, function(error, response, body) {
					// console.log(body);
			});

			res.redirect('/');
		}
		else {
			request.post({
				headers: { 
					'content-type': 'application/json', 
				},
				url:'http://' + IPAddress + ':8787/netset',
				body:'{"method":"' + jsonData.comm_method + '", "ip":"' + jsonData.ip + '", "sub":"' + jsonData.sub + '", "gw":"' + jsonData.gw + '", "dns":"' + jsonData.dns + '"}'
				}, function(error, response, body) {
					// console.log(body);
			});

			res.redirect('http://' + jsonData.ip + ':8001/');
		}

		// res.redirect('/settings');
	} catch(err) {
		console.error(err);
		next(err);
	}
});

router.post('/settings/pwchange', isLoggedIn, async (req, res, next) => {
	try{
		// console.log(req.body);
		const {email, password, repeat_password} = req.body;
		// console.log(password);

		// PW Check
		if(password.length < 8){
			res.render('settings', {
				title: 'Atelier Capture - Settings',
				status: 1,
			})
			return;
		}

		if(password != repeat_password){
			res.render('settings', {
				title: 'Atelier Capture - Settings',
				status: 2,
			})
			return;
		}

		const hash = await bcrypt.hash(password, 12); // 12 : password -> hash로 변환할 때 얼마나 복잡하게 할 것인지

			await User.update(
				{email: email, password: hash, pwForget:false},
				{where:{id:1}}
			);

		res.redirect('../auth/logout');
	} catch(err) {
		console.error(err);
		next(err);
	}
});

router.post('/sendemail', async (req, res, next) => {
	try{
		// console.log(req.body);

		const { email } = req.body;
		// console.log(email);
		const tempPW = Math.random().toString(36).substr(2,11);
		// console.log(tempPW);

		const myAccount = await User.findOne(
			{ where: { id: 1 }}
		);

		if(myAccount.email == null || myAccount.email != email) {
			res.render('index', {
				title: 'Atelier Capture',
				status: 1,
			})
			return;
		}

		let emailParam = {
			toEmail: email,
			subject: '[Atelier Capture] Temporary Password',	
			// text: 'Be sure to change your password after logging in.\r\n\r\n\r\n' + tempPW,
			html: '<h1>Be sure to change your password after logging in.</h1><br><br><h2>' + tempPW +'</h2>'
		};
		
		mailer.sendGmail(emailParam);

		res.redirect('/');

		const hash = await bcrypt.hash(tempPW, 12);

		await User.update(
			{password:hash , pwforget: true},
			{where:{id:1}}
		);
	} catch(err) {
		console.error(err);
		next(err);
	}
});

router.get('/search', (req, res, next) => {
	try{
		net.get_active_interface(function(err, obj){
			// console.log(obj);
			res.send(obj);
		});
	} catch(err) {
		console.error(err);
		next(err);
	}
});

router.get('/getrunstatus', isLoggedIn, (req, res, next) => {
	try{
		// console.log(JSON.parse(JSON.stringify(runStatus)));
		// res.send(runStatus);
		const strData = '{"data":"' + runStatus + '"}';
		// res.sendStatus(200);
		res.send(strData);
	} catch(err) {
		console.error(err);
		next(err);
	}
});

// POST /message Router
/*
router.post('/message', (req, res) => {
	try {
		// 현재 로그인 ID DB에서 조회하고,
		// DB 에서 AcToken 확인 및 갱신 기간 확인하고,
		// 갱신기간 1달 이내면 ReToken으로 갱신하고,
		// 이상 없으면 메시지 보내기 구현
	
		request.post({
			headers: { 
				'content-type': 'application/x-www-form-urlencoded', 
				'Authorization': 'Bearer t1rtwEpRiEMiA_F4oW4ikvFJAXM_XqOvkmTGwAopyV8AAAF_lS6eew'
			},
			url:'https://kapi.kakao.com/v2/api/talk/memo/default/send',
			body:'template_object={ \
				"object_type":"text", \
				"text":"[알람 발생!!!] Test Message", \
				"link":{ \
					"web_rul":"https://www.uisn.co.kr" \
				}, \
				"button_title":"바로 확인" \
			}'
			}, function(error, response, body) {
				console.log(body);
		});

		// console.log("Request MSG!!!");
		res.sendStatus(200);
	} catch(err){
		console.error(err);
		next(err);
	}
});
*/

module.exports = router