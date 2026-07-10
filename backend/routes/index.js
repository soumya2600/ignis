const router = require('express').Router();
const healthController = require('../controllers/health.controller');
const authRoutes = require('./auth.routes');
const alertRoutes = require('./alert.routes');
const predictionRoutes = require('./prediction.routes');
const weatherRoutes = require('./weather.routes');

// Public health & diagnostics
router.get('/health', healthController.getHealth);
router.get('/test-db', healthController.testDatabase);

// Feature routes
router.use('/auth', authRoutes);
router.use('/alerts', alertRoutes);
router.use('/predictions', predictionRoutes);
router.use('/weather', weatherRoutes);

module.exports = router;
