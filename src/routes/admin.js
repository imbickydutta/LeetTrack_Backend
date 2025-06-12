const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin');
const { protect, authorize } = require('../middleware/auth');

// Protect all admin routes
router.use(protect);
router.use(authorize('admin'));

// Admin routes
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId/stats', adminController.getUserStats);

module.exports = router; 