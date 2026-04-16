import db from '../models/database.js';
import crypto from 'crypto';
import { sendPushNotification } from '../routes/notificationsRoutes.js';

function generateFriendCode() {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
}

export async function generateCode(req, res) {
  try {
    const userId = req.userId;
    const user = await db.oneOrNone('SELECT friend_code FROM users WHERE id = $1', [userId]);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    let friendCode = user.friend_code;

    // Si por alguna razón el usuario no tiene código aún, le generamos uno
    if (!friendCode) {
      friendCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      await db.none('UPDATE users SET friend_code = $1 WHERE id = $2', [friendCode, userId]);
    }

    res.json({ friendCode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function addFriendByCode(req, res) {
  try {
    const { friendCode } = req.body;
    const userId = req.userId;

    if (!friendCode) {
      return res.status(400).json({ error: 'Código de amigo requerido' });
    }

    const friend = await db.oneOrNone('SELECT id FROM users WHERE friend_code = $1', [friendCode]);

    if (!friend) {
      return res.status(404).json({ error: 'Código de amigo no válido' });
    }

    const friendId = friend.id;

    if (friendId === userId) {
      return res.status(400).json({ error: 'No puedes agregarte a ti mismo' });
    }

    // Verificar si ya son amigos
    const existingFriendship = await db.oneOrNone(
      'SELECT id FROM friends WHERE userId = $1 AND friendId = $2',
      [userId, friendId]
    );

    if (existingFriendship) {
      return res.status(400).json({ error: 'Ya eres amigo de este usuario' });
    }

    await db.none(
      'INSERT INTO friends (userId, friendId) VALUES ($1, $2)',
      [userId, friendId]
    );

    await db.none(
      'INSERT INTO friends (userId, friendId) VALUES ($1, $2)',
      [friendId, userId]
    );

    // Get the name of the user who added the friend
    const user = await db.oneOrNone('SELECT username FROM users WHERE id = $1', [userId]);

    // Send push notification to the friend
    sendPushNotification(friendId, {
      title: '¡Nuevo amigo!',
      body: `${user?.username || 'Alguien'} te ha agregado como amigo.`,
      icon: '/icons/icon-192x192.png',
      url: '/'
    });

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

export async function removeFriend(req, res) {
  try {
    const userId = req.userId;
    const { friendId } = req.params;

    if (!friendId) {
      return res.status(400).json({ error: 'ID de amigo requerido' });
    }

    // Check if friendship exists
    const friendship = await db.oneOrNone(
      'SELECT id FROM friends WHERE userId = $1 AND friendId = $2',
      [userId, friendId]
    );

    if (!friendship) {
      return res.status(404).json({ error: 'No sois amigos' });
    }

    // Delete friendship (both records)
    await db.none('DELETE FROM friends WHERE userId = $1 AND friendId = $2', [userId, friendId]);
    await db.none('DELETE FROM friends WHERE userId = $1 AND friendId = $2', [friendId, userId]);

    res.json({ message: 'Amigo eliminado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function startBattle(req, res) {
  try {
    const { friendId, userTeamId, friendTeamId } = req.body;
    const userId = req.userId;

    if (!friendId || !userTeamId) {
      return res.status(400).json({ error: 'friendId y userTeamId son requeridos' });
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

    let actualFriendTeamId = friendTeamId;
    if (!actualFriendTeamId) {
      const friendTeams = await db.any('SELECT id FROM teams WHERE userId = $1', [friendId]);
      if (friendTeams && friendTeams.length > 0) {
        const randomIdx = Math.floor(Math.random() * friendTeams.length);
        actualFriendTeamId = friendTeams[randomIdx].id;
      }
    }

    const team2 = await db.oneOrNone(
      'SELECT * FROM teams WHERE id = $1 AND userId = $2',
      [actualFriendTeamId, friendId]
    );

    // Get the name of the user who started the battle
    const user = await db.oneOrNone('SELECT username FROM users WHERE id = $1', [userId]);

    if (!team2) {
      return res.status(404).json({ error: 'Equipo del amigo no encontrado' });
    }

    const team1Pokemon = await db.any('SELECT * FROM team_pokemon WHERE teamId = $1 ORDER BY position ASC', [team1.id]);
    const team2Pokemon = await db.any('SELECT * FROM team_pokemon WHERE teamId = $1 ORDER BY position ASC', [team2.id]);
    team1.pokemon = team1Pokemon || [];
    team2.pokemon = team2Pokemon || [];

    const result = await db.result(
      'INSERT INTO battles (userId, friendId, userTeamId, friendTeamId, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [userId, friendId, userTeamId, actualFriendTeamId, 'pending']
    ).catch(async (err) => {
        // Fallback for earlier schema if status column doesn't exist
        const r = await db.result(
          'INSERT INTO battles (userId, friendId, userTeamId, friendTeamId) VALUES ($1, $2, $3, $4) RETURNING id',
          [userId, friendId, userTeamId, actualFriendTeamId]
        );
        return r;
    });

    const battleId = result.rows[0].id;
    
    // Almacenar en mapa en memoria como respaldo si se requiere mantener el estado real-time
    if (!global.battles) global.battles = new Map();
    global.battles.set(battleId, { status: 'pending', initiator: userId, target: friendId });

    // Send push notification to the friend
    sendPushNotification(friendId, {
      title: '¡Has sido retado a una batalla!',
      body: `${user?.username || 'Un amigo'} te ha desafiado a una batalla Pokémon.`,
      icon: '/icons/icon-192x192.png',
      url: `/battle/${battleId}`
    });

    res.status(201).json({
      message: 'Desafío de batalla enviado',
      battleId: battleId,
      teams: { team1, team2 }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function calculateBattleResult(req, res) {
  try {
    const { battleId, winnerId } = req.body;
    const userId = req.userId;

    const battle = await db.oneOrNone(
      'SELECT * FROM battles WHERE id = $1',
      [battleId]
    );

    if (!battle) {
      return res.status(404).json({ error: 'Batalla no encontrada' });
    }

    // Validate the battle locally if needed, but here we trust the frontend's winner if it matches a participant.
    let winner = null;
    if (winnerId === userId || winnerId === battle.friendId) {
      winner = winnerId;
    } else {
      // Si el frontend no mandó un winnerId válido, validamos al azar como fallback retrocompatible
      winner = Math.random() > 0.5 ? userId : battle.friendId;
    }

    await db.none(
      'UPDATE battles SET winner = $1, updatedAt = CURRENT_TIMESTAMP WHERE id = $2',
      [winner, battleId]
    );

    res.json({ winner, message: 'Batalla finalizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getBattle(req, res) {
  try {
    const battleId = req.params.id;
    const battle = await db.oneOrNone('SELECT * FROM battles WHERE id = $1', [battleId]);
    if (!battle) return res.status(404).json({ error: 'Batalla no encontrada' });
    
    // In pg-promise columns are lowercased
    const userTeamId = battle.userteamid || battle.userTeamId;
    const friendTeamId = battle.friendteamid || battle.friendTeamId;

    const team1 = await db.oneOrNone('SELECT * FROM teams WHERE id = $1', [userTeamId]);
    const team2 = await db.oneOrNone('SELECT * FROM teams WHERE id = $1', [friendTeamId]);
    
    if (!team1 || !team2) return res.status(404).json({ error: 'Equipos no encontrados' });

    const team1Pokemon = await db.any('SELECT * FROM team_pokemon WHERE teamId = $1 ORDER BY position ASC', [team1.id]);
    const team2Pokemon = await db.any('SELECT * FROM team_pokemon WHERE teamId = $1 ORDER BY position ASC', [team2.id]);
    
    team1.pokemon = team1Pokemon || [];
    team2.pokemon = team2Pokemon || [];

    res.json({
      battleId: battle.id,
      userId: battle.userid || battle.userId,
      friendId: battle.friendid || battle.friendId,
      teams: {
        team1,
        team2
      }
    });
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