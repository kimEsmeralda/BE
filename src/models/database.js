import pgPromise from 'pg-promise';
import dotenv from 'dotenv';

dotenv.config();

const pgp = pgPromise();

const connectionString = process.env.DATABASE_URL;
const useSsl = connectionString && (connectionString.includes('sslmode=require') || process.env.PGSSLMODE === 'require');

const db = pgp(
  connectionString
    ? {
        connectionString,
        ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      }
);

db.connect()
  .then(() => console.log('Database connected'))
  .catch((err) => console.error('Error opening database:', err));

export async function initializeDatabase() {
  try {
    // Tabla de usuarios
    await db.none(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        username VARCHAR(255) UNIQUE NOT NULL,
        googleId VARCHAR(255) UNIQUE,
        googleEmail VARCHAR(255),
        googlePicture VARCHAR(500),
        push_subscription JSONB,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add column if it doesn't exist for existing tables
    try {
      await db.none('ALTER TABLE users ADD COLUMN IF NOT EXISTS push_subscription JSONB');
    } catch (e) {
      console.log('Column push_subscription already exists or error adding:', e.message);
    }
    console.log('✓ Users table created and verified with push_subscription');

    // Tabla de pokémon favoritos
    await db.none(`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        pokemonId INTEGER NOT NULL,
        pokemonName VARCHAR(255) NOT NULL,
        addedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(userId, pokemonId)
      )
    `);
    console.log('✓ Favorites table created');

    // Tabla de equipos
    await db.none(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Teams table created');

    // Tabla de pokémon en equipos
    await db.none(`
      CREATE TABLE IF NOT EXISTS team_pokemon (
        id SERIAL PRIMARY KEY,
        teamId INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        pokemonId INTEGER NOT NULL,
        pokemonName VARCHAR(255) NOT NULL,
        position INTEGER DEFAULT 0,
        addedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Team Pokemon table created');

    // Tabla de amigos
    await db.none(`
      CREATE TABLE IF NOT EXISTS friends (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        friendId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(userId, friendId)
      )
    `);
    console.log('✓ Friends table created');

    // Tabla de batallas
    await db.none(`
      CREATE TABLE IF NOT EXISTS battles (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        friendId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        userTeamId INTEGER REFERENCES teams(id) ON DELETE SET NULL,
        friendTeamId INTEGER REFERENCES teams(id) ON DELETE SET NULL,
        winner INTEGER REFERENCES users(id) ON DELETE SET NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Battles table created');

    console.log('✨ Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

export default db;
