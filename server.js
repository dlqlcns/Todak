import { createServer } from 'http';
import { createReadStream, promises as fs } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, 'dist');
const port = process.env.PORT || 4173;

// Database bootstrap (lazy to keep server usable without deps during local dev)
const mysqlModule = import('mysql2/promise').catch(error => {
  console.error('mysql2 is not available. Install dependencies to enable DB access.', error);
  return null;
});
let poolPromise;

const getPool = async () => {
  if (!poolPromise) {
    poolPromise = mysqlModule
      .then(mysql => {
        if (!mysql) {
          throw new Error('Missing mysql2 dependency');
        }
        return mysql.createPool({
          host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
          port: Number(process.env.MYSQLPORT || process.env.DB_PORT || 3306),
          user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
          password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
          database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'todak',
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
        });
      })
      .catch(error => {
        console.error('Failed to initialize MySQL client. Make sure mysql2 is installed and DB is reachable.', error);
        throw error;
      });
  }
  return poolPromise;
};

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const pipe = promisify(pipeline);

const parseJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error('Invalid JSON payload');
  }
};

const hashPassword = (password) => {
  const salt = randomBytes(16);
  const hashed = scryptSync(password, salt, 64);
  return `${salt.toString('base64')}:${hashed.toString('base64')}`;
};

const verifyPassword = (password, storedHash) => {
  const [saltB64, hashB64] = storedHash.split(':');
  if (!saltB64 || !hashB64) return false;
  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(hashB64, 'base64');
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, expected);
};

const sendJson = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
};

const sendFile = async (filePath, res) => {
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  try {
    res.writeHead(200, { 'Content-Type': contentType });
    await pipe(createReadStream(filePath), res);
  } catch (error) {
    console.error(`Failed to serve file: ${filePath}`, error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
    }
    res.end('Internal Server Error');
  }
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);

    // ---- API Routing ----
    if (pathname.startsWith('/api/')) {
      if (req.method === 'POST' && pathname === '/api/signup') {
        const body = await parseJsonBody(req);
        const { loginId, password, nickname } = body || {};
        if (!loginId || !password || !nickname) {
          sendJson(res, 400, { error: 'loginId, password, nickname are required' });
          return;
        }

        const pool = await getPool().catch(() => null);
        if (!pool) {
          sendJson(res, 503, { error: 'Database unavailable. Install mysql2 and configure DB connection.' });
          return;
        }

        try {
          const hashed = hashPassword(password);
          const startDate = new Date();
          const [result] = await pool.execute(
            'INSERT INTO users (login_id, password_hash, nickname, start_date) VALUES (?, ?, ?, ?)',
            [loginId, hashed, nickname, startDate]
          );

          sendJson(res, 201, {
            id: result.insertId,
            loginId,
            nickname,
            startDate: startDate.toISOString(),
          });
        } catch (error) {
          console.error('Signup failed', error);
          if (error.code === 'ER_DUP_ENTRY') {
            sendJson(res, 409, { error: '이미 사용 중인 아이디입니다.' });
            return;
          }
          sendJson(res, 500, { error: '회원가입 처리 중 오류가 발생했어요.' });
        }
        return;
      }

      if (req.method === 'POST' && pathname === '/api/login') {
        const body = await parseJsonBody(req);
        const { loginId, password } = body || {};
        if (!loginId || !password) {
          sendJson(res, 400, { error: 'loginId와 password를 입력해주세요.' });
          return;
        }

        const pool = await getPool().catch(() => null);
        if (!pool) {
          sendJson(res, 503, { error: 'Database unavailable. Install mysql2 and configure DB connection.' });
          return;
        }

        try {
          const [rows] = await pool.execute('SELECT id, login_id, password_hash, nickname, start_date FROM users WHERE login_id = ? LIMIT 1', [loginId]);
          const user = rows[0];
          if (!user || !verifyPassword(password, user.password_hash)) {
            sendJson(res, 401, { error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
            return;
          }

          sendJson(res, 200, {
            id: user.id,
            loginId: user.login_id,
            nickname: user.nickname,
            startDate: new Date(user.start_date).toISOString(),
          });
        } catch (error) {
          console.error('Login failed', error);
          sendJson(res, 500, { error: '로그인 처리 중 오류가 발생했어요.' });
        }
        return;
      }

      const moodMatch = pathname.match(/^\/api\/users\/(\d+)\/moods(?:\/(\d{4}-\d{2}-\d{2}))?$/);
      const deleteUserMatch = pathname.match(/^\/api\/users\/(\d+)$/);

      if (moodMatch) {
        const userId = Number(moodMatch[1]);
        const recordDate = moodMatch[2];
        const pool = await getPool().catch(() => null);
        if (!pool) {
          sendJson(res, 503, { error: 'Database unavailable. Install mysql2 and configure DB connection.' });
          return;
        }

        if (req.method === 'GET' && !recordDate) {
          try {
            const [records] = await pool.execute(
              'SELECT id, external_id, record_date, content, ai_message, timestamp_ms FROM mood_records WHERE user_id = ? ORDER BY record_date DESC',
              [userId]
            );

            if (records.length === 0) {
              sendJson(res, 200, { records: [] });
              return;
            }

            const recordIds = records.map(r => r.id);
            const [emotionRows] = await pool.query('SELECT mood_record_id, emotion_id FROM mood_record_emotions WHERE mood_record_id IN (?)', [recordIds]);
            const [recRows] = await pool.query('SELECT mood_record_id, rec_type, rec_key, title, description, link FROM mood_recommendations WHERE mood_record_id IN (?)', [recordIds]);

            const emotionMap = new Map();
            emotionRows.forEach(row => {
              const list = emotionMap.get(row.mood_record_id) || [];
              list.push(row.emotion_id);
              emotionMap.set(row.mood_record_id, list);
            });

            const recMap = new Map();
            recRows.forEach(row => {
              const list = recMap.get(row.mood_record_id) || [];
              list.push({
                id: row.rec_key,
                type: row.rec_type,
                title: row.title,
                desc: row.description,
                link: row.link,
              });
              recMap.set(row.mood_record_id, list);
            });

            const formatted = records.map(record => ({
              id: record.external_id,
              date: record.record_date instanceof Date ? record.record_date.toISOString().slice(0, 10) : record.record_date,
              emotionIds: emotionMap.get(record.id) || [],
              content: record.content,
              aiMessage: record.ai_message,
              recommendations: recMap.get(record.id) || [],
              timestamp: Number(record.timestamp_ms),
            }));

            sendJson(res, 200, { records: formatted });
          } catch (error) {
            console.error('Failed to fetch moods', error);
            sendJson(res, 500, { error: '기록을 불러오지 못했어요.' });
          }
          return;
        }

        if (req.method === 'POST' && !recordDate) {
          const body = await parseJsonBody(req);
          const { date, emotionIds, content, aiMessage, recommendations, timestamp } = body || {};
          if (!date || !emotionIds || !Array.isArray(emotionIds) || !content || !timestamp) {
            sendJson(res, 400, { error: 'date, emotionIds, content, timestamp 필드는 필수입니다.' });
            return;
          }

          const connection = await pool.getConnection();
          try {
            await connection.beginTransaction();

            const [existingRows] = await connection.execute(
              'SELECT id, external_id FROM mood_records WHERE user_id = ? AND record_date = ? LIMIT 1',
              [userId, date]
            );

            let recordId;
            let externalId;
            if (existingRows.length > 0) {
              recordId = existingRows[0].id;
              externalId = existingRows[0].external_id;
              await connection.execute(
                'UPDATE mood_records SET content = ?, ai_message = ?, timestamp_ms = ? WHERE id = ?',
                [content, aiMessage || null, timestamp, recordId]
              );
            } else {
              externalId = randomUUID();
              const [result] = await connection.execute(
                'INSERT INTO mood_records (user_id, external_id, record_date, content, ai_message, timestamp_ms) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, externalId, date, content, aiMessage || null, timestamp]
              );
              recordId = result.insertId;
            }

            await connection.execute('DELETE FROM mood_record_emotions WHERE mood_record_id = ?', [recordId]);
            for (const emotionId of emotionIds) {
              await connection.execute('INSERT INTO mood_record_emotions (mood_record_id, emotion_id) VALUES (?, ?)', [recordId, emotionId]);
            }

            await connection.execute('DELETE FROM mood_recommendations WHERE mood_record_id = ?', [recordId]);
            if (recommendations && Array.isArray(recommendations)) {
              for (const rec of recommendations) {
                await connection.execute(
                  'INSERT INTO mood_recommendations (mood_record_id, rec_type, rec_key, title, description, link) VALUES (?, ?, ?, ?, ?, ?)',
                  [recordId, rec.type, rec.id || randomUUID(), rec.title, rec.desc || '', rec.link || null]
                );
              }
            }

            await connection.commit();

            sendJson(res, 200, {
              id: externalId,
              date,
              emotionIds,
              content,
              aiMessage,
              recommendations: recommendations || [],
              timestamp,
            });
          } catch (error) {
            await connection.rollback();
            console.error('Failed to save mood', error);
            sendJson(res, 500, { error: '기록 저장에 실패했어요.' });
          } finally {
            connection.release();
          }
          return;
        }

        if (req.method === 'DELETE' && recordDate) {
          try {
            const [rows] = await pool.execute('SELECT id FROM mood_records WHERE user_id = ? AND record_date = ? LIMIT 1', [userId, recordDate]);
            if (rows.length === 0) {
              sendJson(res, 404, { error: '삭제할 기록을 찾지 못했어요.' });
              return;
            }
            const recordId = rows[0].id;
            await pool.execute('DELETE FROM mood_records WHERE id = ?', [recordId]);
            sendJson(res, 200, { success: true });
          } catch (error) {
            console.error('Failed to delete mood', error);
            sendJson(res, 500, { error: '기록 삭제에 실패했어요.' });
          }
          return;
        }
      }

      if (deleteUserMatch && req.method === 'DELETE') {
        const userId = Number(deleteUserMatch[1]);
        const pool = await getPool().catch(() => null);
        if (!pool) {
          sendJson(res, 503, { error: 'Database unavailable. Install mysql2 and configure DB connection.' });
          return;
        }

        try {
          await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
          sendJson(res, 200, { success: true });
        } catch (error) {
          console.error('Failed to delete user', error);
          sendJson(res, 500, { error: '회원 탈퇴 처리 중 오류가 발생했어요.' });
        }
        return;
      }

      sendJson(res, 404, { error: 'API route not found' });
      return;
    }

    // ---- Static asset handling ----
    let filePath = path.join(distDir, pathname);
    const hasExtension = path.extname(pathname) !== '';

    if (!filePath.startsWith(distDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    let fileStats;
    try {
      fileStats = await fs.stat(filePath);
      if (fileStats.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
        fileStats = await fs.stat(filePath);
      }
    } catch (error) {
      if (hasExtension) {
        console.error(`Asset not found: ${pathname}`, error);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      filePath = path.join(distDir, 'index.html');
      fileStats = await fs.stat(filePath);
    }

    if (fileStats.isFile()) {
      await sendFile(filePath, res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
