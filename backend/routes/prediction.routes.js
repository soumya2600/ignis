const router = require('express').Router();
const predictionController = require('../controllers/prediction.controller');


router.get('/latest', predictionController.getLatest);
router.get('/stats', predictionController.getStats);
router.get('/region/:regionId', predictionController.getByRegion);
router.post('/chat', predictionController.chat);

module.exports = router;
