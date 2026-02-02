import express from 'express';
import {
  addFavorite,
  removeFavorite,
  getFavorites,
  isFavorite
} from '../controllers/favoritesController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

router.post('/', addFavorite);
router.get('/', getFavorites);
router.delete('/:pokemonId', removeFavorite);
router.get('/:pokemonId/check', isFavorite);

export default router;
