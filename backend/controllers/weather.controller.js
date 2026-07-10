const weatherService = require('../services/weather.service');
const { success, error, badRequest } = require('../utils/response');

const getWeather = async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    if (lat == null || lon == null) {
      return badRequest(res, 'lat and lon are required query parameters');
    }

    const data = await weatherService.getCurrentWeather(parseFloat(lat), parseFloat(lon));
    return res.json(data);
  } catch (err) {
    if (err.message === 'Weather API Offline') {
      return res.status(503).json({ success: false, message: err.message });
    }
    return error(res, err.message);
  }
};

module.exports = { getWeather };
