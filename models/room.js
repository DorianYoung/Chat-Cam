module.exports = function(sequelize, DataTypes) {
  var Room = sequelize.define("Room", {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  });
  
  Room.associate = function(models) {
    Room.hasMany(models.User);
  }

  return Room;
};