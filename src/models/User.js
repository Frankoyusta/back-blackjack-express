// src/models/User.js
const { v4: uuidv4 } = require('uuid');
const { INITIAL_COINS } = require('../config/constants');

class User {
  constructor(username, socketId) {
    this.id = uuidv4();
    this.username = username;
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

module.exports = User;