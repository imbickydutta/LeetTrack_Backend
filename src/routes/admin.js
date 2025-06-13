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

// Submission Management routes
router.get('/submissions', adminController.getAllSubmissions);
router.get('/topics', adminController.getAllTopics);
router.get('/users/list', adminController.getUsersList);
router.put('/submissions/:submissionId/review', adminController.reviewSubmission);

module.exports = router; 