const router = require('express').Router();
const alertController = require('../controllers/alert.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');

router.get('/', requireAuth, alertController.listAlerts);
router.get('/unread-count', requireAuth, alertController.getUnreadCount);
router.get('/:id', requireAuth, alertController.getAlert);
router.post('/', requireAuth, requireRole(['admin', 'forest_officer']), alertController.createAlert);
router.patch('/:id/read', requireAuth, alertController.markRead);
router.patch('/read-all', requireAuth, alertController.markAllRead);
router.delete('/:id', requireAuth, requireRole('admin'), alertController.deleteAlert);

module.exports = router;
