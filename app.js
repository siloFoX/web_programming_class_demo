// ===== NPM Packages Import =====
const os = require('os');
const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const session = require('express-session');
const nunjucks = require('nunjucks');
const dotenv = require('dotenv');
const passport = require('passport');
const exec = require('child_process').exec;
const request = require('request');

// ===== User Middleware Import =====
dotenv.config();
const pageRouter = require('./routes/page');
const authRouter = require('./routes/auth');
const { sequelize } = require('./models');
const passportConfig = require('./passport');
const Device = require('./models/device');

// ===== App Setting =====
const app = express();
passportConfig();	// Passport Setting
app.set('port', process.env.PORT || 8001);	// App Port Setting
// Nunjucks Setting
app.set('view engine', 'html'); // View Engine : HTML(or njk) 사용
nunjucks.configure('views', {   // views Directory 설정,
	express: app, // app 객체 연결
	watch: true,  // true : HTML 파일이 변경될 때 템플릿 엔진들 다시 렌더링
});

// ===== Mysql Sync =====
sequelize.sync({ force: false }) // True로 설정 시 매 시작시 마다 DB 초기화 후 재생성 - 추후에 false로 수정
  .then(() => {
    console.log('DB Connect!!!');

    Device.update(
      {deviceStatus: 'Stop'},
      {where:{deviceStatus:'Run', deviceStatus:'Loading...'}}
    );

    // IP 정보 얻기
    let IPAddress = '';
    const interfaces = os.networkInterfaces();
		for (let devName in interfaces) {
			let iface = interfaces[devName];
			for (let i = 0; i < iface.length; i++) {
				let alias = iface[i];
				if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
					IPAddress = alias.address;
				}
			}
		}

    // Stop Docker Post 
    request.post({
			headers: { 
				'content-type': 'application/json', 
			},
			url:'http://' + IPAddress + ':8787/stop',
			body:'{}'
			}, function(error, response, body) {
				// console.log(body);
		});
  })
  .catch((err) => {
    console.error(err);
  });

// ===== Connecting Middleware to App.js =====
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));  // public directory connect
app.use(express.json());
app.use(express.urlencoded({ extended:false })); // false : Node querystring module | true : NPM qs extended module
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(session({	// express-session : 세션 관리용 Middleware
  resave: false,
  saveUninitialized: false,
  secret: process.env.COOKIE_SECRET,
  cookie: {
    httpOnly: true,	// true : JS에서 쿠키에 접근할 수 없음.
    secure: false,	// true : only https
  },
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/', pageRouter);			// Page Router <-> app.js
app.use('/auth', authRouter);	// Auth Router <-> app.js

// 404 Error 처리 Middleware
app.use((req, res, next) => {
  const error =  new Error(`${req.method} ${req.url} Not Found.`);
  error.status = 404;
  next(error);  // !
});

// Error 처리 Middleware
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = process.env.NODE_ENV !== 'production' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});


app.listen(app.get('port'), () => {
	console.log(app.get('port'), 'Port Listen.')
});
