// src/models/User.js
const { v4: uuidv4 } = require('uuid');
const { INITIAL_COINS } = require('../config/constants');
const bcrypt = require('bcryptjs');

// User class definition (used for creating new users)
class User {
  constructor(username, password, socketId) {
    this._id = uuidv4(); // MongoDB compatible ID
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

// User operations using MongoDB native driver
const UserOperations = {
  COLLECTION_NAME: 'Users',

  // Create a new user with hashed password
  async createUser(username, password, socketId = null) {
    const { createReport } = require('../config/db');
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create the user object
    const userData = new User(username, hashedPassword, socketId);
    
    // Insert into MongoDB
    const result = await createReport(userData, this.COLLECTION_NAME);
    return result.insertedId;
  },

  // Find a user by username
  async findByUsername(username) {
    const { getDocument } = require('../config/db');
    return await getDocument(this.COLLECTION_NAME, { username });
  },

  // Find a user by ID
  async findById(id) {
    const { getDocument } = require('../config/db');
    return await getDocument(this.COLLECTION_NAME, { id: id });
  },

  // Update user information
  async updateUser(id, updateData) {
    const { updateReport } = require('../config/db');
    return await updateReport(id, updateData, this.COLLECTION_NAME, { _id: id });
  },

  // Authenticate a user
  async authenticate(username, password) {
    const user = await this.findByUsername(username);
    
    if (!user) {
      return null;
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    return isMatch ? user : null;
  },

  // Update user's table status
  async joinTable(userId, tableId) {
    const { updateDocument } = require('../config/db');
    return await updateDocument({ currentTableId: tableId }, this.COLLECTION_NAME, { _id: userId });
  },

  // Remove user from table
  async leaveTable(userId) {
    const { updateDocument } = require('../config/db');
    return await updateDocument({ currentTableId: null }, this.COLLECTION_NAME, { _id: userId });
  },

  // Update user's coins
  async updateCoins(userId, amount) {
    const { updateDocument } = require('../config/db');
    return await updateDocument({ coins: amount }, this.COLLECTION_NAME, { _id: userId });
  },
  
  // Update user's socket ID
  async updateSocketId(userId, socketId) {
    const { updateDocument } = require('../config/db');
    return await updateDocument({ socket: socketId }, this.COLLECTION_NAME, { _id: userId });
  },

  // Get all users
  async getAllUsers() {
    const { getCollection } = require('../config/db');
    return await getCollection(this.COLLECTION_NAME);
  }
};

module.exports = { User, UserOperations };