const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

const user = require('../models/user');
const { User } = require('../models');

module.exports = () => {
	passport.use(new LocalStrategy({
		usernameField: 'userId',
		passwordField: 'password',
	}, async (userId, password, done) => {
		try {
			const exUser = await User.findOne({ where: { userId } });
			if(exUser) {
				const result = await bcrypt.compare(password, exUser.password);
				if(result) {
					done(null, exUser);
				} else {
					done(null, false, { message: 'Passwords do not match.'});
				} 
			} else {
				done(null, false, { message: 'You are not a registered member.'})
			}
		} catch(error) {
			console.error(error);
			done(error);
		}
	}));
};