const express = require('express');
const router = express.Router();
const { getRecommendations } = require('../controllers/recommendation');
const { protect } = require('../middleware/auth');

router.get('/', protect, getRecommendations);

module.exports = router; 