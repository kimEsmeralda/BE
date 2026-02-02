import db from '../models/database.js';

export async function createTeam(req, res) {
  try {
    const { name, description } = req.body;
    const userId = req.userId;

    if (!name) {
      return res.status(400).json({ error: 'El nombre del equipo es requerido' });
    }

    const result = await db.result(
      'INSERT INTO teams (userId, name, description) VALUES ($1, $2, $3) RETURNING id',
      [userId, name, description || '']
    );

    res.status(201).json({ message: 'Equipo creado', teamId: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getTeams(req, res) {
  try {
    const userId = req.userId;

    const teams = await db.any(
      'SELECT * FROM teams WHERE userId = $1 ORDER BY createdAt DESC',
      [userId]
    );

    const teamsWithPokemon = await Promise.all(
      teams.map(async (team) => {
        const pokemon = await db.any(
          'SELECT * FROM team_pokemon WHERE teamId = $1 ORDER BY position ASC',
          [team.id]
        );
        return { ...team, pokemon: pokemon || [] };
      })
    );

    res.json(teamsWithPokemon);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getTeam(req, res) {
  try {
    const { teamId } = req.params;
    const userId = req.userId;

    const team = await db.oneOrNone(
      'SELECT * FROM teams WHERE id = $1 AND userId = $2',
      [teamId, userId]
    );

    if (!team) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    const pokemon = await db.any(
      'SELECT * FROM team_pokemon WHERE teamId = $1 ORDER BY position ASC',
      [teamId]
    );

    res.json({ ...team, pokemon: pokemon || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function addPokemonToTeam(req, res) {
  try {
    const { teamId } = req.params;
    const { pokemonId, pokemonName } = req.body;
    const userId = req.userId;

    if (!pokemonId || !pokemonName) {
      return res.status(400).json({ error: 'pokemonId y pokemonName son requeridos' });
    }

    const team = await db.oneOrNone(
      'SELECT id FROM teams WHERE id = $1 AND userId = $2',
      [teamId, userId]
    );

    if (!team) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    const countResult = await db.one(
      'SELECT COUNT(*) as count FROM team_pokemon WHERE teamId = $1',
      [teamId]
    );

    if (parseInt(countResult.count) >= 6) {
      return res.status(400).json({ error: 'Un equipo puede tener máximo 6 pokémon' });
    }

    const position = parseInt(countResult.count) + 1;

    const result = await db.result(
      'INSERT INTO team_pokemon (teamId, pokemonId, pokemonName, position) VALUES ($1, $2, $3, $4) RETURNING id',
      [teamId, pokemonId, pokemonName, position]
    );

    res.status(201).json({ message: 'Pokémon agregado al equipo', id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function removePokemonFromTeam(req, res) {
  try {
    const { teamId, pokemonTeamId } = req.params;
    const userId = req.userId;

    const team = await db.oneOrNone(
      'SELECT id FROM teams WHERE id = $1 AND userId = $2',
      [teamId, userId]
    );

    if (!team) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    const deleteResult = await db.result(
      'DELETE FROM team_pokemon WHERE id = $1 AND teamId = $2',
      [pokemonTeamId, teamId]
    );

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ error: 'Pokémon no encontrado en el equipo' });
    }

    const pokemon = await db.any(
      'SELECT id FROM team_pokemon WHERE teamId = $1 ORDER BY position ASC',
      [teamId]
    );

    for (let index = 0; index < pokemon.length; index++) {
      await db.none(
        'UPDATE team_pokemon SET position = $1 WHERE id = $2',
        [index + 1, pokemon[index].id]
      );
    }

    res.json({ message: 'Pokémon removido del equipo' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteTeam(req, res) {
  try {
    const { teamId } = req.params;
    const userId = req.userId;

    const result = await db.result(
      'DELETE FROM teams WHERE id = $1 AND userId = $2',
      [teamId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    res.json({ message: 'Equipo eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

