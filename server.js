import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isPlaceholder(value) {
  return typeof value === 'string' && value.includes('${');
}

function parseDbUrl(urlString) {
  try {
    if (!urlString || isPlaceholder(urlString)) return null;
    const url = new URL(urlString);
    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.replace('/', '') || undefined,
    };
  } catch (err) {
    console.error('DB URL parsing failed:', err.message);
    return null;
  }
}

function resolveDbConfig() {
  const parsed = parseDbUrl(process.env.MYSQL_URL || process.env.DATABASE_URL || process.env.MYSQL_PUBLIC_URL);
  const host =
    (!isPlaceholder(process.env.MYSQLHOST) && process.env.MYSQLHOST) ||
    (!isPlaceholder(process.env.MYSQL_HOST) && process.env.MYSQL_HOST) ||
    (!isPlaceholder(process.env.RAILWAY_TCP_PROXY_DOMAIN) && process.env.RAILWAY_TCP_PROXY_DOMAIN) ||
    (!isPlaceholder(process.env.RAILWAY_PRIVATE_DOMAIN) && process.env.RAILWAY_PRIVATE_DOMAIN);
  const port =
    (!isPlaceholder(process.env.MYSQLPORT) && process.env.MYSQLPORT) ||
    (!isPlaceholder(process.env.MYSQL_PORT) && process.env.MYSQL_PORT) ||
    (!isPlaceholder(process.env.RAILWAY_TCP_PROXY_PORT) && process.env.RAILWAY_TCP_PROXY_PORT) ||
    (!isPlaceholder(process.env.RAILWAY_PRIVATE_PORT) && process.env.RAILWAY_PRIVATE_PORT);
  const user =
    (!isPlaceholder(process.env.MYSQLUSER) && process.env.MYSQLUSER) ||
    (!isPlaceholder(process.env.MYSQL_USER) && process.env.MYSQL_USER) ||
    'root';
  const password =
    (!isPlaceholder(process.env.MYSQLPASSWORD) && process.env.MYSQLPASSWORD) ||
    (!isPlaceholder(process.env.MYSQL_PASSWORD) && process.env.MYSQL_PASSWORD) ||
    (!isPlaceholder(process.env.MYSQL_ROOT_PASSWORD) && process.env.MYSQL_ROOT_PASSWORD);
  const database =
    (!isPlaceholder(process.env.MYSQL_DATABASE) && process.env.MYSQL_DATABASE) ||
    (!isPlaceholder(process.env.MYSQLDATABASE) && process.env.MYSQLDATABASE);

  return {
    host: parsed?.host || host || 'localhost',
    port: parsed?.port || Number(port) || 3306,
    user: parsed?.user || user,
    password: parsed?.password || password,
    database: parsed?.database || database,
    waitForConnections: true,
    connectionLimit: 10,
  };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash?.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

const dbConfig = resolveDbConfig();
const pool = mysql.createPool(dbConfig);

async function testDbConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    console.log(
      `✅ MySQL connected: ${conn.config.host}:${conn.config.port}${conn.config.database ? `/${conn.config.database}` : ''}`
    );
    conn.release();
  } catch (err) {
    console.error('❌ MySQL connection failed:', err);
  }
}

testDbConnection();

const app = express();
app.use(cors());
app.use(express.json());

function mapUser(row) {
  return {
    id: row.id,
    loginId: row.login_id,
    nickname: row.nickname,
    startDate: row.start_date?.toISOString?.() || row.start_date,
  };
}

app.post('/api/signup', async (req, res) => {
  const { loginId, password, nickname } = req.body || {};

  if (!loginId || !password || !nickname) {
    return res.status(400).send('아이디, 비밀번호, 닉네임을 모두 입력해주세요.');
  }

  const conn = await pool.getConnection();
  try {
    const [existing] = await conn.query('SELECT id FROM users WHERE login_id = ?', [loginId]);
    if (Array.isArray(existing) && existing.length > 0) {
      return res.status(400).send('이미 사용 중인 아이디예요.');
    }

    const passwordHash = hashPassword(password);
    const now = new Date();
    const [result] = await conn.query(
      'INSERT INTO users (login_id, password_hash, nickname, start_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [loginId, passwordHash, nickname, now, now, now]
    );

    const newUser = { id: result.insertId, loginId, nickname, startDate: now.toISOString() };
    res.json(newUser);
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).send('회원가입 처리 중 오류가 발생했어요.');
  } finally {
    conn.release();
  }
});

app.post('/api/login', async (req, res) => {
  const { loginId, password } = req.body || {};
  if (!loginId || !password) {
    return res.status(400).send('아이디와 비밀번호를 모두 입력해주세요.');
  }

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT * FROM users WHERE login_id = ?', [loginId]);
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) {
      return res.status(401).send('존재하지 않는 아이디예요.');
    }

    const match = verifyPassword(password, row.password_hash);
    if (!match) {
      return res.status(401).send('비밀번호가 올바르지 않아요.');
    }

    res.json(mapUser(row));
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('로그인 처리 중 오류가 발생했어요.');
  } finally {
    conn.release();
  }
});

app.get('/api/moods', async (req, res) => {
  const userId = Number(req.query.userId);
  if (!userId) {
    return res.status(400).send('userId가 필요합니다.');
  }

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT mr.id, mr.record_date, mr.content, mr.ai_message, mr.timestamp_ms, mre.emotion_id
       FROM mood_records mr
       LEFT JOIN mood_record_emotions mre ON mr.id = mre.mood_record_id
       WHERE mr.user_id = ?
       ORDER BY mr.record_date DESC`,
      [userId]
    );

    const grouped = new Map();
    for (const row of rows) {
      const existing = grouped.get(row.id) || {
        id: row.id,
        date: row.record_date instanceof Date ? row.record_date.toISOString().slice(0, 10) : row.record_date,
        emotionIds: [],
        content: row.content || '',
        aiMessage: row.ai_message || undefined,
        timestamp: row.timestamp_ms ?? Date.now(),
      };

      if (row.emotion_id && !existing.emotionIds.includes(row.emotion_id)) {
        existing.emotionIds.push(row.emotion_id);
      }
      grouped.set(row.id, existing);
    }

    res.json(Array.from(grouped.values()));
  } catch (err) {
    console.error('Fetch moods error:', err);
    res.status(500).send('감정 기록을 불러오지 못했어요.');
  } finally {
    conn.release();
  }
});

app.post('/api/moods', async (req, res) => {
  const { userId, date, emotionIds, content, aiMessage } = req.body || {};

  if (!userId || !date || !Array.isArray(emotionIds) || emotionIds.length === 0 || !content) {
    return res.status(400).send('필수 정보가 누락되었어요.');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existingRows] = await conn.query(
      'SELECT id FROM mood_records WHERE user_id = ? AND record_date = ?',
      [userId, date]
    );

    let recordId = Array.isArray(existingRows) && existingRows[0]?.id;
    const nowMs = Date.now();

    if (recordId) {
      await conn.query(
        'UPDATE mood_records SET content = ?, ai_message = ?, timestamp_ms = ?, updated_at = ? WHERE id = ?',
        [content, aiMessage || null, nowMs, new Date(), recordId]
      );
      await conn.query('DELETE FROM mood_record_emotions WHERE mood_record_id = ?', [recordId]);
    } else {
      const [insertResult] = await conn.query(
        'INSERT INTO mood_records (user_id, record_date, content, ai_message, timestamp_ms, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, date, content, aiMessage || null, nowMs, new Date(), new Date()]
      );
      recordId = insertResult.insertId;
    }

    const emotionValues = emotionIds.map((emotionId) => [recordId, emotionId]);
    if (emotionValues.length > 0) {
      await conn.query(
        'INSERT INTO mood_record_emotions (mood_record_id, emotion_id) VALUES ?',
        [emotionValues]
      );
    }

    await conn.commit();

    res.json({ id: recordId, date, emotionIds, content, aiMessage, timestamp: nowMs });
  } catch (err) {
    await conn.rollback();
    console.error('Save mood error:', err);
    res.status(500).send('감정 기록 저장에 실패했어요.');
  } finally {
    conn.release();
  }
});

app.delete('/api/moods/:id', async (req, res) => {
  const recordId = Number(req.params.id);
  if (!recordId) {
    return res.status(400).send('삭제할 기록 id가 필요합니다.');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM mood_record_emotions WHERE mood_record_id = ?', [recordId]);
    await conn.query('DELETE FROM mood_records WHERE id = ?', [recordId]);
    await conn.commit();
    res.status(204).end();
  } catch (err) {
    await conn.rollback();
    console.error('Delete mood error:', err);
    res.status(500).send('기록 삭제에 실패했어요.');
  } finally {
    conn.release();
  }
});

app.get('/api/health', async (_req, res) => {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(500).send('DB 연결에 실패했어요.');
  }
});

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log('DB config:', { ...dbConfig, password: dbConfig.password ? '***' : undefined });
});
