const express = require('express');
const router = express.Router();

const teamsRouter = require('./teams');
const playersRouter = require('./players');
const metricsRouter = require('./metrics');
const recordsRouter = require('./records');
const usersRouter = require('./users');

router.use('/teams', teamsRouter);
router.use('/players', playersRouter);
router.use('/health-metrics', metricsRouter);
router.use('/health-records', recordsRouter);
router.use('/users', usersRouter);

module.exports = router;