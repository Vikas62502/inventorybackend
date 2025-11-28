const express = require('express');
const router = express.Router();
const { login, getCurrentUser } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/login', login);
router.get('/me', authenticate, getCurrentUser);

module.exports = router;






