const express = require('express');
const favoritesController = require('../controllers/favorites');

const router = express.Router();

router.get('/favorites', favoritesController.getFavorites);
router.delete('/favorites/:id', favoritesController.deleteFavorite);
router.post('/favorites/:id/share', favoritesController.shareFavorites);
router.post('/favorites/:id/copy', favoritesController.copyFavorite);
router.post('/workouts/:id/favorite', favoritesController.createFavorite);
router.get('/favorites/:id', favoritesController.showFavorite);


module.exports = router;

