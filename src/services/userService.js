// src/services/userService.js
const User = require('../models/User');

// Almacenamiento de usuarios y sockets
const users = new Map(); // userId -> userData
const userSockets = new Map(); // userId -> socket

function registerUser(username, socketId) {
  const user = new User(username, socketId);
  users.set(user.id, user);
  userSockets.set(user.id, socketId);
  return user;
}

function getUser(userId) {
  return users.get(userId);
}

function getUserBySocket(socketId) {
  for (const [userId, user] of users.entries()) {
    if (user.socket === socketId) {
      return { userId, user };
    }
  }
  return null;
}

function updateUser(user) {
  users.set(user.id, user);
  return user;
}

function removeUser(userId) {
  users.delete(userId);
  userSockets.delete(userId);
}

function getSocket(userId) {
  return userSockets.get(userId);
}

function setSocket(userId, socket) {
  userSockets.set(userId, socket);
}

module.exports = {
  users,
  userSockets,
  registerUser,
  getUser,
  getUserBySocket,
  updateUser,
  removeUser,
  getSocket,
  setSocket
};