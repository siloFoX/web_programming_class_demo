const Sequelize = require('sequelize');
const env = process.env.NODE_ENV || 'development'; // 실제 배포 : 'production' 으로 수정
const config = require('../config/config')[env];
const User = require('./user');
const Device = require('./device');

const db = {};
const sequelize = new Sequelize(
  config.database, config.username, config.password, config,
);

db.sequelize = sequelize;
db.User = User; 
db.Device = Device;

User.init(sequelize);
Device.init(sequelize);

User.associate(db);
Device.associate(db);

module.exports = db;
