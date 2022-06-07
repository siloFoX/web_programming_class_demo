const Sequelize = require('sequelize');

module.exports = class Deivce extends Sequelize.Model {
  static init(sequelize) {
    return super.init({
      // deviceName: {
      //   type: Sequelize.STRING(40),
      //   allowNull: false,
      // },
      deviceDesc: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
      deviceStatus: {
        type: Sequelize.STRING(40),
        allowNull: false,
      },
			// deviceType: {
      //   type: Sequelize.TEXT,
      //   allowNull: false,
      // },
      // deviceAdd: {
      //   type: Sequelize.TEXT,
      //   allowNull: false,
      // },
      rtspAdd: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      cameraAdd: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      // storageAdd: {
      //   type: Sequelize.TEXT,
      //   allowNull: false,
      // },
      detectionModel: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      // filter: {
      //   type: Sequelize.JSON,
      //   allowNull: true,
      // },
			// alarmSend: {
      //   type: Sequelize.BOOLEAN,
      //   allowNull: true,
      // },
      // alarmDay: {
      //   type: Sequelize.JSON,
      //   allowNull: true,
      // },
			// alarmStartTime: {
      //   type: Sequelize.TIME,
      //   allowNull: true,
      // },
			// alarmEndTime: {
      //   type: Sequelize.TIME,
      //   allowNull: true,
      // },
    }, {
      sequelize,
      timestamps: false,
      underscored: false,
      modelName: 'Device',
      tableName: 'devices',
      paranoid: true,
      charset: 'utf8',
      collate: 'utf8_general_ci',
    });
  }

	static associate(db){
		db.Device.belongsTo(db.User, { foreignKey: 'owner', targetKey: 'userId' });
	}
};
