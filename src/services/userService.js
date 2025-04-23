// src/services/userService.js
const { User, UserOperations } = require('../models/User');

// Store socket mappings (we still need this for real-time functionality)
const userSockets = new Map(); // userId -> socket

async function registerUser(username, password, socketId) {
  try {
    // Check if user already exists
    const existingUser = await UserOperations.findByUsername(username);
    if (existingUser) {
      throw new Error('Username already exists');
    }
    
    // Create a new user in the database
    const userId = await UserOperations.createUser(username, password, socketId);
    
    // Store socket mapping
    if (socketId) {
      userSockets.set(userId.toString(), socketId);
    }
    
    // Return the new user
    return await UserOperations.findById(userId);
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
}

async function getUser(userId) {
  try {
    return await UserOperations.findById(userId);
  } catch (error) {
    console.error(`Error getting user with ID ${userId}:`, error);
    return null;
  }
}

async function getUserBySocket(socketId) {
  try {
    // Get all users and find the one with matching socket ID
    const users = await UserOperations.getAllUsers();
    const user = users.find(user => user.socket === socketId);
    
    if (user) {
      return { userId: user._id, user };
    }
    return null;
  } catch (error) {
    console.error(`Error getting user by socket ${socketId}:`, error);
    return null;
  }
}

async function updateUser(user) {
  try {
    // Extract the ID and update data
    const { _id, ...updateData } = user;
    await UserOperations.updateUser(_id, updateData);
    return user;
  } catch (error) {
    console.error(`Error updating user ${user._id}:`, error);
    throw error;
  }
}

async function removeUser(userId) {
  try {
    // In a production app, you might want to handle user deletion differently
    // For now, we'll just remove the socket mapping
    userSockets.delete(userId.toString());
  } catch (error) {
    console.error(`Error removing user ${userId}:`, error);
  }
}

function getSocket(userId) {
  return userSockets.get(userId.toString());
}

async function setSocket(userId, socketId) {
  try {
    // Update the socket ID in the database
    await UserOperations.updateSocketId(userId, socketId);
    
    // Update our local mapping
    userSockets.set(userId.toString(), socketId);
  } catch (error) {
    console.error(`Error setting socket for user ${userId}:`, error);
  }
}

async function joinTable(userId, tableId) {
  try {
    await UserOperations.joinTable(userId, tableId);
    return await UserOperations.findById(userId);
  } catch (error) {
    console.error(`Error joining table ${tableId} for user ${userId}:`, error);
    throw error;
  }
}

async function leaveTable(userId) {
  try {
    await UserOperations.leaveTable(userId);
    return await UserOperations.findById(userId);
  } catch (error) {
    console.error(`Error leaving table for user ${userId}:`, error);
    throw error;
  }
}

async function updateCoins(userId, amount) {
  try {
    await UserOperations.updateCoins(userId, amount);
    return await UserOperations.findById(userId);
  } catch (error) {
    console.error(`Error updating coins for user ${userId}:`, error);
    throw error;
  }
}

async function authenticateUser(username, password) {
  try {
    return await UserOperations.authenticate(username, password);
  } catch (error) {
    console.error(`Error authenticating user ${username}:`, error);
    return null;
  }
}

module.exports = {
  userSockets,
  registerUser,
  getUser,
  getUserBySocket,
  updateUser,
  removeUser,
  getSocket,
  setSocket,
  joinTable,
  leaveTable,
  updateCoins,
  authenticateUser
};