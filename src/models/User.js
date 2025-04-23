// src/models/User.js
const { v4: uuidv4 } = require('uuid');
const { INITIAL_COINS } = require('../config/constants');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

class User {
  constructor(username, password, socketId) {
    this._id = uuidv4(); // Changed from id to _id for MongoDB compatibility
    this.username = username;
    this.password = password;
    this.coins = INITIAL_COINS;
    this.currentTableId = null;
    this.socket = socketId;
  }
  
  joinTable(tableId) {
    this.currentTableId = tableId;
    return this;
  }
  
  leaveTable() {
    this.currentTableId = null;
    return this;
  }
  
  updateCoins(amount) {
    this.coins = amount;
    return this;
  }
}

// MongoDB Schema
const UserSchema = new mongoose.Schema({
  // Removed separate id field - MongoDB will use _id
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  coins: { type: Number, default: INITIAL_COINS },
  currentTableId: { type: String, default: null },
  socket: { type: String, default: null }
});

// Password hashing middleware
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const UserModel = mongoose.model('Users', UserSchema);

module.exports = { User, UserModel };