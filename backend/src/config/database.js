const path = require('path');
const fs = require('fs');

// Determine if we're in production (Render) or development
const isProduction = process.env.NODE_ENV === 'production';

let db;
let query;
let exec;

if (isProduction) {
  // PostgreSQL for production (Render)
  const { Pool } = require('pg');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  pool.on('connect', () => {
    console.log('Connected to PostgreSQL database');
  });

  pool.on('error', (err) => {
    console.error('Database connection error:', err);
  });

  query = (text, params) => pool.query(text, params);
  exec = (sql) => pool.query(sql);
  db = pool;

  module.exports = { query, exec, db, pool, isProduction: true };
} else {
  // SQLite for local development
  const Database = require('better-sqlite3');

  const dbPath = path.join(__dirname, '..', '..', 'data', 'kucing_comel.db');
  const dataDir = path.dirname(dbPath);

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const sqliteDb = new Database(dbPath);
  sqliteDb.pragma('foreign_keys = ON');

  console.log('Connected to SQLite database');

  // Convert PostgreSQL-style $1, $2 placeholders to ? for SQLite
  function convertPlaceholders(sql) {
    return sql.replace(/\$\d+/g, '?');
  }

  query = (text, params = []) => {
    const sql = convertPlaceholders(text);

    try {
      const upperSql = sql.trim().toUpperCase();
      const isSelect = upperSql.startsWith('SELECT');
      const hasReturning = upperSql.includes('RETURNING');

      if (isSelect) {
        const stmt = sqliteDb.prepare(sql);
        const rows = stmt.all(...params);
        return { rows };
      } else if (hasReturning) {
        const returningMatch = text.match(/RETURNING\s+(.+?)(?:;?\s*$)/i);

        if (upperSql.startsWith('INSERT')) {
          const stmt = sqliteDb.prepare(sql.replace(/\s+RETURNING\s+.+$/i, ''));
          const result = stmt.run(...params);

          if (returningMatch) {
            const tableName = text.match(/INSERT\s+INTO\s+(\w+)/i)?.[1];
            if (tableName) {
              const selectStmt = sqliteDb.prepare(`SELECT ${returningMatch[1]} FROM ${tableName} WHERE rowid = ?`);
              const rows = [selectStmt.get(result.lastInsertRowid)];
              return { rows, lastInsertRowid: result.lastInsertRowid };
            }
          }
          return { rows: [], lastInsertRowid: result.lastInsertRowid, changes: result.changes };
        } else if (upperSql.startsWith('UPDATE')) {
          const tableName = text.match(/UPDATE\s+(\w+)/i)?.[1];
          const whereClause = text.match(/WHERE\s+(.+?)(?:\s+RETURNING)/i)?.[1];

          const updateSql = sql.replace(/\s+RETURNING\s+.+$/i, '');
          const stmt = sqliteDb.prepare(updateSql);
          const result = stmt.run(...params);

          if (returningMatch && tableName && whereClause) {
            const selectSql = `SELECT ${returningMatch[1]} FROM ${tableName} WHERE ${convertPlaceholders(whereClause)}`;
            const selectStmt = sqliteDb.prepare(selectSql);
            const whereParams = params.slice(-1);
            const rows = selectStmt.all(...whereParams);
            return { rows, changes: result.changes };
          }
          return { rows: [], changes: result.changes };
        } else if (upperSql.startsWith('DELETE')) {
          const tableName = text.match(/DELETE\s+FROM\s+(\w+)/i)?.[1];
          const whereClause = text.match(/WHERE\s+(.+?)(?:\s+RETURNING)/i)?.[1];

          let rows = [];
          if (returningMatch && tableName && whereClause) {
            const selectSql = `SELECT ${returningMatch[1]} FROM ${tableName} WHERE ${convertPlaceholders(whereClause)}`;
            const selectStmt = sqliteDb.prepare(selectSql);
            rows = selectStmt.all(...params);
          }

          const deleteSql = sql.replace(/\s+RETURNING\s+.+$/i, '');
          const stmt = sqliteDb.prepare(deleteSql);
          const result = stmt.run(...params);

          return { rows, changes: result.changes };
        }
      }

      const stmt = sqliteDb.prepare(sql);
      const result = stmt.run(...params);
      return { rows: [], changes: result.changes, lastInsertRowid: result.lastInsertRowid };
    } catch (error) {
      console.error('SQL Error:', error.message);
      console.error('Query:', sql);
      console.error('Params:', params);
      throw error;
    }
  };

  exec = (sql) => {
    sqliteDb.exec(sql);
    return { rows: [] };
  };

  db = sqliteDb;

  module.exports = { query, exec, db, isProduction: false };
}
