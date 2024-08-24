import express from 'express';
import * as favoritesController from '../controllers/favorites';

const router = express.Router();

router.get('/favorites', favoritesController.getFavorites);
router.delete('/favorites/:id', favoritesController.deleteFavorite);
router.post('/favorites/:id/share', favoritesController.shareFavorites);
router.post('/favorites/:id/copy', favoritesController.copyFavorite);
router.post('/workouts/:id/favorite', favoritesController.createFavorite);
router.put('/favorites/:id/toggle-public', favoritesController.toggleIsPublic);
router.get('/favorites/:id', favoritesController.showFavorite);
router.get('/users/:username/favorites', favoritesController.viewOtherFavorites);


export default router;

