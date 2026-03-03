import mysql from 'mysql2/promise';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

let db;
let isSQLite = false;

async function initDB() {
  // Try MySQL first if DB_HOST is provided
  if (process.env.DB_HOST && process.env.DB_HOST !== 'localhost') {
    try {
      console.log('📡 Attempting to connect to MySQL...');
      const dbConfig = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        multipleStatements: true
      };
      const connection = await mysql.createConnection(dbConfig);
      const dbName = process.env.DB_NAME || 'quiz_cert_engine';
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
      await connection.end();

      db = mysql.createPool({
        ...dbConfig,
        database: dbName,
        waitForConnections: true,
        connectionLimit: 10
      });
      console.log('✅ Connected to MySQL');
    } catch (err) {
      console.warn('⚠️ MySQL connection failed, falling back to SQLite:', err.message);
      await setupSQLite();
    }
  } else {
    // Default to SQLite for easy deployment
    await setupSQLite();
  }

  await initializeTables();
}

async function setupSQLite() {
  isSQLite = true;
  const dbPath = path.join(__dirname, '../database/database.sqlite');
  console.log(`📦 Using SQLite database at: ${dbPath}`);
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
}

async function initializeTables() {
  try {
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Check if users table exists as a proxy for schema initialization
    let tableExists = false;
    if (isSQLite) {
      const table = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
      tableExists = !!table;
    } else {
      const [tables] = await db.query('SHOW TABLES LIKE "users"');
      tableExists = tables.length > 0;
    }

    if (!tableExists) {
      console.log('👷 Initializing database schema...');

      // Split and clean queries
      let queries = schemaSql
        .split(';')
        .map(q => q.trim())
        .filter(q => q && !q.startsWith('--') && !q.includes('CREATE DATABASE') && !q.includes('USE '));

      for (let query of queries) {
        if (isSQLite) {
          // SQLite compatibility fixes
          let sqliteQuery = query
            .replace(/INT AUTO_INCREMENT PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
            .replace(/INT AUTO_INCREMENT/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
            .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/gi, 'DATETIME DEFAULT CURRENT_TIMESTAMP')
            .replace(/ENUM\([^)]+\)/gi, 'TEXT')
            .replace(/FOREIGN KEY \([^)]+\) REFERENCES [^ ]+ \([^)]+\) ON DELETE CASCADE/gi, (match) => match);

          try {
            await db.run(sqliteQuery);
          } catch (e) {
            console.error('SQLite Query Error:', e.message, '\nQuery:', sqliteQuery);
          }
        } else {
          await db.query(query);
        }
      }
      console.log('✅ Schema initialized');

      // Seed Admin and Samples
      const seedPath = path.join(__dirname, '../database/seed.sql');
      if (fs.existsSync(seedPath)) {
        console.log('🌱 Seeding initial data...');
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        const seedQueries = seedSql.split(';').map(q => q.trim()).filter(q => q && !q.includes('USE '));

        for (let query of seedQueries) {
          if (isSQLite) {
            // Very basic @variable handling for SQLite (only for simple IDs)
            let q = query.replace(/@\w+/g, '1'); // Fallback for simple seeds
            try { await db.run(q); } catch (e) { }
          } else {
            await db.query(query);
          }
        }
        console.log('✅ Seeding complete');
      }
    }
  } catch (err) {
    console.error('❌ Table Initialization Failed:', err.message);
  }
}

// Track initialization state
let isReady = false;
const initPromise = initDB().then(() => {
  isReady = true;
  console.log('🚀 Database ready for queries');
}).catch(err => {
  console.error('💥 Database critical failure:', err);
});

// Export a unified query interface
export default {
  query: async (text, params) => {
    if (!isReady) {
      await initPromise;
    }

    if (isSQLite) {
      const sql = text.trim();
      const isSelect = sql.toUpperCase().startsWith('SELECT');

      if (isSelect) {
        const results = await db.all(text, params);
        return [results]; // return [rows, fields]
      } else {
        const result = await db.run(text, params);
        return [{ insertId: result.lastID, affectedRows: result.changes }];
      }
    } else {
      return db.query(text, params);
    }
  }
};

