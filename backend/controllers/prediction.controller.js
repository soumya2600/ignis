const predictionService = require('../services/prediction.service');
const { success, error } = require('../utils/response');

const getLatest = async (req, res) => {
  try {
    const data = await predictionService.getLatestPredictions(+req.query.limit || 10);
    return success(res, data);
  } catch (err) {
    return error(res, err.message);
  }
};

const getByRegion = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await predictionService.getPredictionsByRegion(req.params.regionId, { page: +page, limit: +limit });
    return success(res, result);
  } catch (err) {
    return error(res, err.message);
  }
};

const getStats = async (req, res) => {
  try {
    const data = await predictionService.getPredictionStats();
    return success(res, data);
  } catch (err) {
    return error(res, err.message);
  }
};

const axios = require('axios');

const chat = async (req, res) => {
  try {
    const AI_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
    const { message, location, context } = req.body;
    
    if (!message || !location) {
      return res.status(400).json({ success: false, message: 'Message and location are required' });
    }

    const response = await axios.post(`${AI_URL}/chat`, { message, location, context: context || '' }, { timeout: 20000 });
    return res.json(response.data);
  } catch (err) {
    return res.status(500).json({ reply: 'Chatbot failed to respond: ' + err.message });
  }
};

const predictRisk = async (req, res) => {
  try {
    const AI_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
    const response = await axios.post(`${AI_URL}/predict-risk`, req.body, { timeout: 10000 });
    return res.json(response.data);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'AI Prediction failed', error: err.message });
  }
};

module.exports = { getLatest, getByRegion, getStats, chat, predictRisk };
