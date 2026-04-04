const express = require('express');
const router = express.Router();

const teamsRouter = require('./teams');
const playersRouter = require('./players');
const metricsRouter = require('./metrics');
const recordsRouter = require('./records');
const usersRouter = require('./users');
const exportRouter = require('./export');
const reportsRouter = require('./reports');
const settingsRouter = require('./settings');
const attachmentsRouter = require('./attachments');

router.use('/teams', teamsRouter);
router.use('/players', playersRouter);
router.use('/health-metrics', metricsRouter);
router.use('/health-records', recordsRouter);
router.use('/users', usersRouter);
router.use('/export', exportRouter);
router.use('/reports', reportsRouter);
router.use('/settings', settingsRouter);
router.use('/attachments', attachmentsRouter);

module.exports = router;