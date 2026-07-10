const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/refresh', authController.refreshSession);
router.get('/profile', requireAuth, authController.getProfile);

module.exports = router;
