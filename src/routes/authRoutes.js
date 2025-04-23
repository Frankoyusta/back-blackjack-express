const express = require('express');
const { login, updateSocketId } = require('../controllers/authController');

const router = express.Router();

// Login route
router.post('/login', login);

// Update socket ID
router.post('/update-socket', updateSocketId);

module.exports = router;
