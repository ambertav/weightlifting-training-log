const express = require('express');
const usersController = require('../controllers/users');

const router = express.Router();

router.get('/signup', usersController.signupView);
router.post('/signup', usersController.signupUser);
router.get('/login', usersController.loginView);
router.post('/login', usersController.loginUser);
router.get('/logout', usersController.logoutUser);


module.exports = router;