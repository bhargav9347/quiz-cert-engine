import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();

// Initial connection to create DB if not exists
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
};

const pool = mysql.createPool({
  ...dbConfig,
  database: process.env.DB_NAME || 'quiz_cert_engine',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection and auto-create DB/Tables
(async () => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const dbName = process.env.DB_NAME || 'quiz_cert_engine';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.end();

    const poolConn = await pool.getConnection();

    // Check if tables exist
    const [tables] = await poolConn.query('SHOW TABLES');
    if (tables.length === 0) {
      console.log('📦 Initializing database tables...');
      const schemaPath = path.join(__dirname, '../database/schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');

      // Execute schema (ignoring CREATE DATABASE as we just did it)
      const queries = schemaSql.split(';').filter(q => q.trim() && !q.includes('CREATE DATABASE') && !q.includes('USE '));
      for (let query of queries) {
        await poolConn.query(query);
      }
      console.log('✅ Tables initialized successfully');
    }

    // Check for quizzes and seed if empty
    const [quizCount] = await poolConn.query('SELECT COUNT(*) as count FROM quizzes');
    console.log(`📊 Current Quiz Count: ${quizCount[0].count}`);
    if (quizCount[0].count === 0) {
      console.log('🌱 No quizzes found. Seeding sample quizzes...');
      const seedPath = path.join(__dirname, '../database/seed.sql');
      if (fs.existsSync(seedPath)) {
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        const seedQueries = seedSql.split(';').filter(q => q.trim() && !q.includes('USE '));
        for (let query of seedQueries) {
          // Handle SET @var logic by checking if query contains it
          // mysql2/promise .query handles multiple statements if enabled, 
          // but we are looping, so session variables like @quiz1_id work within the same connection.
          await poolConn.query(query);
        }
        console.log('✅ Seeding completed');
      }
    }

    console.log('✅ MySQL Connected Successfully');
    poolConn.release();
  } catch (err) {
    if (err.code === 'ER_DBACCESS_DENIED_ERROR') {
      console.error('❌ MySQL Access Denied. Check your DB_USER and DB_PASSWORD in .env');
    } else {
      console.error('❌ MySQL Initialization Failed:', err.message);
    }
  }
})();

export default pool;
