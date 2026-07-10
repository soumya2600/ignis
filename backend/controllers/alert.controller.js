const alertService = require('../services/alert.service');
const { success, created, error, notFound, badRequest } = require('../utils/response');

const listAlerts = async (req, res) => {
  try {
    const { page = 1, limit = 50, severity, is_read } = req.query;
    const isRead = is_read === 'true' ? true : is_read === 'false' ? false : undefined;
    const result = await alertService.getAlerts({ page: +page, limit: +limit, severity, isRead });
    return success(res, result);
  } catch (err) {
    return error(res, err.message);
  }
};

const getAlert = async (req, res) => {
  try {
    const data = await alertService.getAlertById(req.params.id);
    if (!data) return notFound(res, 'Alert not found');
    return success(res, data);
  } catch (err) {
    return error(res, err.message);
  }
};

const createAlert = async (req, res) => {
  try {
    const { title, message, severity, lat, lng, region_id } = req.body;
    if (!title || !message || !severity) return badRequest(res, 'title, message, and severity are required');
    const data = await alertService.createAlert({ title, message, severity, lat, lng, region_id });
    return created(res, data, 'Alert created');
  } catch (err) {
    return error(res, err.message);
  }
};

const markRead = async (req, res) => {
  try {
    const data = await alertService.markAlertRead(req.params.id);
    return success(res, data, 'Alert marked as read');
  } catch (err) {
    return error(res, err.message);
  }
};

const markAllRead = async (req, res) => {
  try {
    await alertService.markAllAlertsRead();
    return success(res, null, 'All alerts marked as read');
  } catch (err) {
    return error(res, err.message);
  }
};

const deleteAlert = async (req, res) => {
  try {
    await alertService.deleteAlert(req.params.id);
    return success(res, null, 'Alert deleted');
  } catch (err) {
    return error(res, err.message);
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await alertService.getUnreadCount();
    return success(res, { count });
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { listAlerts, getAlert, createAlert, markRead, markAllRead, deleteAlert, getUnreadCount };
