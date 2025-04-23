const { getDocument, disconnectDB } = require('../config/db');
const { UserModel } = require('../models/User');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Register a new user
exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check if username already exists
    const existingUser = await UserModel.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    // Create new user
    const newUser = new UserModel({
      username,
      password,
    });
    
    await newUser.save();
    
    // Generate token
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        coins: newUser.coins
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  } finally {
    console.log('Registration process completed');
    disconnectDB();
  }

};

// Login user
exports.login = async (req, res) => {
  try {
    console.log('Login request:', req.body);
    const { username, password } = req.body;
    
    // Find user
    const user = await getDocument('Users', { username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await user.password === password; // Replace with bcrypt.compare if using hashed passwords
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        coins: user.coins
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// Update user socket ID
exports.updateSocketId = async (req, res) => {
  try {
    const { userId, socketId } = req.body;
    
    const user = await UserModel.findOneAndUpdate(
      { _id: userId }, // Changed from id to _id
      { socket: socketId },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'Socket ID updated successfully' });
  } catch (error) {
    console.error('Update socket error:', error);
    res.status(500).json({ message: 'Server error updating socket ID' });
  }
};
