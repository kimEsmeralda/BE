import express from 'express';
import {
  createTeam,
  getTeams,
  getTeam,
  addPokemonToTeam,
  removePokemonFromTeam,
  deleteTeam
} from '../controllers/teamsController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

router.post('/', createTeam);
router.get('/', getTeams);
router.get('/:teamId', getTeam);
router.post('/:teamId/pokemon', addPokemonToTeam);
router.delete('/:teamId/pokemon/:pokemonTeamId', removePokemonFromTeam);
router.delete('/:teamId', deleteTeam);

export default router;
