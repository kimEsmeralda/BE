import express from 'express';
import {
  generateCode,
  addFriendByCode,
  getFriends,
  startBattle,
  calculateBattleResult,
  getBattleHistory
} from '../controllers/battleController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

// Rutas de amigos
router.post('/code/generate', generateCode);
router.post('/add', addFriendByCode);
router.get('/', getFriends);

// Rutas de batallas
router.post('/battles/start', startBattle);
router.post('/battles/result', calculateBattleResult);
router.get('/battles/history', getBattleHistory);

export default router;
