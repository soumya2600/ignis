const router = require('express').Router();
const weatherController = require('../controllers/weather.controller');


router.get('/', weatherController.getWeather);

module.exports = router;
