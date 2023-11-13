const express = require('express');
const requestsController = require('../controllers/requests');

const router = express.Router();

router.post('/users/request', requestsController.createRequest);
router.put('/users/request/edit', requestsController.handleRequest);


module.exports = router;