import express from 'express';
import {
  generateCode,
  addFriendByCode,
  getFriends,
  removeFriend,
  startBattle,
  calculateBattleResult,
  getBattleHistory,
  getBattle
} from '../controllers/battleController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

// Rutas de amigos
router.post('/code/generate', generateCode);
router.post('/add', addFriendByCode);
router.get('/', getFriends);
router.delete('/:friendId', removeFriend);

// Rutas de batallas
router.post('/battles/start', startBattle);
router.post('/battles/result', calculateBattleResult);
router.get('/battles/history', getBattleHistory);
router.get('/battles/:id', getBattle);

export default router;
