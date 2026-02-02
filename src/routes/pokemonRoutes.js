import express from 'express';
import {
  getPokemonList,
  getPokemonDetails,
  getPokemonByType,
  getPokemonByRegion,
  getEvolutionChain
} from '../controllers/pokemonController.js';

const router = express.Router();

router.get('/', getPokemonList);
router.get('/:id', getPokemonDetails);
router.get('/type/:type', getPokemonByType);
router.get('/region/:region', getPokemonByRegion);
router.get('/evolution/:chainId', getEvolutionChain);

export default router;
