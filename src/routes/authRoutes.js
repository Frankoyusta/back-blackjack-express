const express = require('express');
const { register, login, updateSocketId } = require('../controllers/authController');

const router = express.Router();

// Register route
router.post('/register', register);

// Login route
router.post('/login', login);

// Update socket ID
router.post('/update-socket', updateSocketId);

module.exports = router;
