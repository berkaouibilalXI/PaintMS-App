// authRoutes.js
const express = require('express');
const router = express.Router();
const { 
    login, 
    changePassword, 
    updateProfile, 
    getUserLogs, 
    getUserTheme, 
    updateTheme 
} = require('../controllers/authController');
const auth = require('../middlewares/authMiddleware');

// Existing routes
router.post('/login', login);
router.get('/me', auth, (req, res) => {
    res.json({ user: req.user });
});

// Settings routes
router.put('/change-password', auth, changePassword);
router.put('/profile', auth, updateProfile);
router.get('/logs', auth, getUserLogs);
router.get('/users/me/theme', auth, getUserTheme);
router.put('/theme', auth, updateTheme);

module.exports = router;