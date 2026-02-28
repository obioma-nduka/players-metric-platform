const express = require('express');
const router = express.Router();

const teamsRouter   = require('./teams');
const playersRouter = require('./players');
const authRouter    = require('./auth');
const metricsRouter = require('./metrics');
const recordsRouter = require('./records');

console.log('teamsRouter   :', typeof teamsRouter,   teamsRouter   ? 'exists' : 'undefined');
console.log('playersRouter :', typeof playersRouter, playersRouter ? 'exists' : 'undefined');
console.log('authRouter    :', typeof authRouter,    authRouter    ? 'exists' : 'undefined');
console.log('metricsRouter :', typeof metricsRouter, metricsRouter ? 'exists' : 'undefined');
console.log('recordsRouter :', typeof recordsRouter, recordsRouter ? 'exists' : 'undefined');

router.use('/teams',          teamsRouter);
router.use('/players',        playersRouter);
router.use('/auth',           authRouter);
router.use('/health-metrics', metricsRouter);
router.use('/health-records', recordsRouter);

module.exports = router;