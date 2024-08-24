import express from 'express';
import * as profilesController from '../controllers/profiles';

const router = express.Router();

router.get('/users/me', profilesController.getOwnProfile);
router.put('/users/me/photo/edit', profilesController.uploadPhoto);
router.put('/users/me/bio/edit', profilesController.updateProfile);
router.get('/users/search', profilesController.searchView);
router.post('/users/search', profilesController.handleSearch);
router.get('/users/:username/profile', profilesController.viewOtherProfile);


export default router;