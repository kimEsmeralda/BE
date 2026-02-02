import db from '../models/database.js';

export async function addFavorite(req, res) {
  try {
    const { pokemonId, pokemonName } = req.body;
    const userId = req.userId;

    if (!pokemonId || !pokemonName) {
      return res.status(400).json({ error: 'pokemonId y pokemonName son requeridos' });
    }

    const favorite = await db.one(
      'INSERT INTO favorites (userId, pokemonId, pokemonName) VALUES ($1, $2, $3) RETURNING id',
      [userId, pokemonId, pokemonName]
    );

    res.status(201).json({ message: 'Pokémon agregado a favoritos', id: favorite.id });
  } catch (err) {
    if (err.message.includes('favorites_userid_pokemonid_key')) {
      return res.status(400).json({ error: 'Este pokémon ya está en favoritos' });
    }
    res.status(500).json({ error: err.message });
  }
}

export async function removeFavorite(req, res) {
  try {
    const { pokemonId } = req.params;
    const userId = req.userId;

    const result = await db.result(
      'DELETE FROM favorites WHERE userId = $1 AND pokemonId = $2',
      [userId, pokemonId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Favorito no encontrado' });
    }

    res.json({ message: 'Pokémon removido de favoritos' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getFavorites(req, res) {
  try {
    const userId = req.userId;

    const favorites = await db.any(
      'SELECT id, pokemonId, pokemonName, addedAt FROM favorites WHERE userId = $1 ORDER BY addedAt DESC',
      [userId]
    );

    res.json(favorites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function isFavorite(req, res) {
  try {
    const { pokemonId } = req.params;
    const userId = req.userId;

    const favorite = await db.oneOrNone(
      'SELECT id FROM favorites WHERE userId = $1 AND pokemonId = $2',
      [userId, pokemonId]
    );

    res.json({ isFavorite: !!favorite });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
