module.exports = function(sequelize, DataTypes) {
  var Chat = sequelize.define("Chat", {
    user: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    room: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    tableName: "chat"
  });
  
  return Chat;
};