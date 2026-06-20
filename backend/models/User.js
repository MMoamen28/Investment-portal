const { DataTypes } = require('sequelize');
const sequelize     = require('../config/sequelize');

const User = sequelize.define('User', {
  id: {
    type:         DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey:   true,
  },
  username: {
    type:      DataTypes.STRING,
    unique:    true,
    allowNull: false,
  },
  password:      { type: DataTypes.STRING, allowNull: false },
  role:          { type: DataTypes.ENUM('INVESTOR', 'EMPLOYEE', 'MANAGER'), allowNull: false },
  approvalGroup: { type: DataTypes.STRING },
  email:         { type: DataTypes.STRING },
  phone:         { type: DataTypes.STRING },
}, {
  tableName:  'users',
  timestamps: true,
});

module.exports = User;
