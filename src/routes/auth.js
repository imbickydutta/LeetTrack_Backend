const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const authController = require('../controllers/auth'); // Import the auth controller

// Register
router.post('/register', authController.registerUser);

// Login
router.post('/login', authController.loginUser);

// Get current user
router.get('/me', protect, authController.getMe);

module.exports = router; 