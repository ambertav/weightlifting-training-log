const express = require('express');
const profilesController = require('../controllers/profiles');

const router = express.Router();

router.get('/users/me', profilesController.getOwnProfile);
router.put('/users/me/photo/edit', profilesController.uploadPhoto);
router.put('/users/me/bio/edit', profilesController.updateProfile);
router.get('/users/search', profilesController.searchView);
router.post('/users/search', profilesController.handleSearch);
router.get('/users/profile/:username', profilesController.viewOtherProfile);


module.exports = router;