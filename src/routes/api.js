const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');

router.get('/tables', tableController.getTables);
router.post('/tables', tableController.createTable);

module.exports = router;