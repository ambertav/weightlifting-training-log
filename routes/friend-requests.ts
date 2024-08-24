import express from 'express';
import * as requestsController from '../controllers/friend-requests';

const router = express.Router();

router.post('/users/request', requestsController.createRequest);
router.put('/users/request/edit', requestsController.handleRequest);


export default router;