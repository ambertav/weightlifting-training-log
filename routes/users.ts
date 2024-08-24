import express from 'express';
import * as usersController from '../controllers/users';

const router = express.Router();

router.get('/signup', usersController.signupView);
router.post('/signup', usersController.signupUser);
router.get('/login', usersController.loginView);
router.post('/login', usersController.loginUser);
router.get('/logout', usersController.logoutUser);


export default router;