import db from '../models/database.js';
import crypto from 'crypto';

function generateFriendCode() {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
}

export async function generateCode(req, res) {
  try {
    const userId = req.userId;
    const friendCode = generateFriendCode();

    await db.none(
      'INSERT INTO friends (userId, friendId) VALUES ($1, $2)',
      [userId, userId]
    );

    res.json({ friendCode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function addFriendByCode(req, res) {
  try {
    const { friendId } = req.body;
    const userId = req.userId;

    if (!friendId) {
      return res.status(400).json({ error: 'ID del amigo requerido' });
    }

    const friend = await db.oneOrNone('SELECT id FROM users WHERE id = $1', [friendId]);

    if (!friend) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (friendId === userId) {
      return res.status(400).json({ error: 'No puedes agregarte a ti mismo' });
    }

    await db.none(
      'INSERT INTO friends (userId, friendId) VALUES ($1, $2)',
      [userId, friendId]
    );

    await db.none(
      'INSERT INTO friends (userId, friendId) VALUES ($1, $2)',
      [friendId, userId]
    );

    res.status(201).json({ message: 'Amigo agregado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getFriends(req, res) {
  try {
    const userId = req.userId;

    const friends = await db.any(
      `SELECT u.id, u.username, u.email 
       FROM friends f 
       JOIN users u ON f.friendId = u.id 
       WHERE f.userId = $1`,
      [userId]
    );

    res.json(friends);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function startBattle(req, res) {
  try {
    const { friendId, userTeamId, friendTeamId } = req.body;
    const userId = req.userId;

    if (!friendId || !userTeamId || !friendTeamId) {
      return res.status(400).json({ error: 'friendId, userTeamId y friendTeamId son requeridos' });
    }

    const friendship = await db.oneOrNone(
      'SELECT id FROM friends WHERE userId = $1 AND friendId = $2',
      [userId, friendId]
    );

    if (!friendship) {
      return res.status(403).json({ error: 'No son amigos' });
    }

    const team1 = await db.oneOrNone(
      'SELECT * FROM teams WHERE id = $1 AND userId = $2',
      [userTeamId, userId]
    );

    if (!team1) {
      return res.status(404).json({ error: 'Tu equipo no encontrado' });
    }

    const team2 = await db.oneOrNone(
      'SELECT * FROM teams WHERE id = $1 AND userId = $2',
      [friendTeamId, friendId]
    );

    if (!team2) {
      return res.status(404).json({ error: 'Equipo del amigo no encontrado' });
    }

    const result = await db.result(
      'INSERT INTO battles (userId, friendId, userTeamId, friendTeamId) VALUES ($1, $2, $3, $4) RETURNING id',
      [userId, friendId, userTeamId, friendTeamId]
    );

    res.status(201).json({
      message: 'Batalla iniciada',
      battleId: result.rows[0].id,
      teams: { team1, team2 }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function calculateBattleResult(req, res) {
  try {
    const { battleId } = req.body;
    const userId = req.userId;

    const battle = await db.oneOrNone(
      'SELECT * FROM battles WHERE id = $1',
      [battleId]
    );

    if (!battle) {
      return res.status(404).json({ error: 'Batalla no encontrada' });
    }

    const winner = Math.random() > 0.5 ? userId : battle.friendId;

    await db.none(
      'UPDATE battles SET winner = $1 WHERE id = $2',
      [winner, battleId]
    );

    res.json({ winner, message: 'Batalla finalizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getBattleHistory(req, res) {
  try {
    const userId = req.userId;

    const battles = await db.any(
      `SELECT b.*, u1.username as userName, u2.username as friendName 
       FROM battles b 
       JOIN users u1 ON b.userId = u1.id 
       JOIN users u2 ON b.friendId = u2.id 
       WHERE b.userId = $1 OR b.friendId = $2 
       ORDER BY b.createdAt DESC`,
      [userId, userId]
    );

    res.json(battles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
