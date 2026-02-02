import db from '../models/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function register(req, res) {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password y username son requeridos' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const user = await db.one(
      'INSERT INTO users (email, password, username) VALUES ($1, $2, $3) RETURNING id, email, username',
      [email, hashedPassword, username]
    );

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user
    });
  } catch (err) {
    if (err.message.includes('users_email_key') || err.message.includes('users_username_key')) {
      return res.status(400).json({ error: 'Email o username ya registrado' });
    }
    res.status(500).json({ error: err.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y password son requeridos' });
    }

    const user = await db.oneOrNone('SELECT * FROM users WHERE email = $1', [email]);

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: { id: user.id, email: user.email, username: user.username }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getProfile(req, res) {
  try {
    const user = await db.oneOrNone('SELECT id, email, username FROM users WHERE id = $1', [req.userId]);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function googleLogin(req, res) {
  try {
    const { googleId, email, username, picture } = req.body;

    if (!googleId || !email) {
      return res.status(400).json({ error: 'googleId y email son requeridos' });
    }

    let user = await db.oneOrNone('SELECT * FROM users WHERE googleId = $1', [googleId]);

    if (!user) {
      user = await db.one(
        'INSERT INTO users (email, googleId, googleEmail, googlePicture, username) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, username',
        [email, googleId, email, picture, username || email.split('@')[0]]
      );
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({
      message: 'Login con Google exitoso',
      token,
      user: { id: user.id, email: user.email, username: user.username }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
