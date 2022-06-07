const passport = require('passport');
const local = require('./localStrategy');
const User = require('../models/user');

module.exports = () => {
	passport.serializeUser((user, done) => {
		done(null, user.id);	// Session에 User의 ID만 저장
	});

	passport.deserializeUser((id, done) => {
		User.findOne({ where: { id }})
		.then(user => done(null, user))	// User의 전체 정보를 복구 -> req.user로 접근 가능
		.catch(err => done(err));
	});

	local();
	//kakao();
};