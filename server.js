import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function mapUser(row) {
  return {
    id: row.id,
    loginId: row.login_id,
    nickname: row.nickname,
    startDate: row.start_date?.toISOString?.() || row.start_date,
  };
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL와 SUPABASE_SERVICE_ROLE_KEY 환경 변수를 설정해주세요.');
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

async function testDbConnection() {
  const { error } = await supabase.from('users').select('id').limit(1);
  if (error) {
    console.error('❌ Supabase connection failed:', error.message);
  } else {
    console.log('✅ Supabase connected');
  }
}

await testDbConnection();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/signup', async (req, res) => {
  const { loginId, password, nickname } = req.body || {};

  if (!loginId || !password || !nickname) {
    return res.status(400).send('아이디, 비밀번호, 닉네임을 모두 입력해주세요.');
  }

  try {
    const { data: existing, error: existingError } = await supabase
      .from('users')
      .select('id')
      .eq('login_id', loginId)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing) {
      return res.status(400).send('이미 사용 중인 아이디예요.');
    }

    const passwordHash = hashPassword(password);
    const now = new Date();
    const { data: inserted, error: insertError } = await supabase
      .from('users')
      .insert({
        login_id: loginId,
        password_hash: passwordHash,
        nickname,
        start_date: now,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();

    if (insertError) {
      throw insertError;
    }

    const newUser = { id: inserted.id, loginId, nickname, startDate: now.toISOString() };
    res.json(newUser);
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).send('회원가입 처리 중 오류가 발생했어요.');
  }
});

app.post('/api/login', async (req, res) => {
  const { loginId, password } = req.body || {};
  if (!loginId || !password) {
    return res.status(400).send('아이디와 비밀번호를 모두 입력해주세요.');
  }

  try {
    const { data: row, error } = await supabase
      .from('users')
      .select('*')
      .eq('login_id', loginId)
      .single();

    if (error) {
      if (error.code === 'PGRST116' || error.code === 'PGRST204') {
        return res.status(401).send('존재하지 않는 아이디예요.');
      }
      throw error;
    }

    const match = verifyPassword(password, row.password_hash);
    if (!match) {
      return res.status(401).send('비밀번호가 올바르지 않아요.');
    }

    res.json(mapUser(row));
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('로그인 처리 중 오류가 발생했어요.');
  }
});

app.get('/api/check-id', async (req, res) => {
  const loginId = req.query.loginId;

  if (!loginId) {
    return res.status(400).send('아이디를 입력해주세요.');
  }

  try {
    const { data: existing, error } = await supabase
      .from('users')
      .select('id')
      .eq('login_id', loginId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116' && error.code !== 'PGRST204') {
      throw error;
    }

    res.json({ available: !existing });
  } catch (err) {
    console.error('Check ID error:', err);
    res.status(500).send('아이디 중복 확인 중 오류가 발생했어요.');
  }
});

app.get('/api/reviews', async (req, res) => {
  const userId = Number(req.query.userId);
  const periodType = String(req.query.periodType || '').trim();
  const periodKey = String(req.query.periodKey || '').trim();

  if (!userId || !periodType || !periodKey) {
    return res.status(400).send('userId, periodType, periodKey가 필요합니다.');
  }

  try {
    const { data, error } = await supabase
      .from('period_reviews')
      .select('content, period_key, period_type, last_mood_ts')
      .eq('user_id', userId)
      .eq('period_type', periodType)
      .eq('period_key', periodKey)
      .maybeSingle();

    if (error && error.code !== 'PGRST116' && error.code !== 'PGRST204') {
      throw error;
    }

    if (!data) {
      return res.json({ review: null });
    }

    res.json({
      review: {
        content: data.content,
        periodKey: data.period_key,
        lastMoodTimestamp: data.last_mood_ts ?? 0,
        periodType: data.period_type,
      },
    });
  } catch (err) {
    console.error('Fetch review error:', err);
    res.status(500).send('회고 데이터를 불러오지 못했어요.');
  }
});

app.post('/api/reviews', async (req, res) => {
  const { userId, periodType, periodKey, content, lastMoodTimestamp } = req.body || {};

  if (!userId || !periodType || !periodKey || !content) {
    return res.status(400).send('userId, periodType, periodKey, content가 필요합니다.');
  }

  try {
    const now = new Date();

    const { data: existing, error: existingError } = await supabase
      .from('period_reviews')
      .select('id')
      .eq('user_id', userId)
      .eq('period_type', periodType)
      .eq('period_key', periodKey)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    let review;
    if (existing?.id) {
      const { data, error } = await supabase
        .from('period_reviews')
        .update({
          content,
          last_mood_ts: lastMoodTimestamp ?? null,
          updated_at: now,
        })
        .eq('id', existing.id)
        .select('content, period_key, period_type, last_mood_ts')
        .single();

      if (error) {
        throw error;
      }
      review = data;
    } else {
      const { data, error } = await supabase
        .from('period_reviews')
        .insert({
          user_id: userId,
          period_type: periodType,
          period_key: periodKey,
          content,
          last_mood_ts: lastMoodTimestamp ?? null,
          created_at: now,
          updated_at: now,
        })
        .select('content, period_key, period_type, last_mood_ts')
        .single();

      if (error) {
        throw error;
      }
      review = review || data;
    }

    res.json({
      review: {
        content: review.content,
        periodKey: review.period_key,
        lastMoodTimestamp: review.last_mood_ts ?? 0,
        periodType: review.period_type,
      },
    });
  } catch (err) {
    console.error('Save review error:', err);
    res.status(500).send('회고 데이터를 저장하지 못했어요.');
  }
});

app.get('/api/moods', async (req, res) => {
  const userId = Number(req.query.userId);
  if (!userId) {
    return res.status(400).send('userId가 필요합니다.');
  }

  try {
    const { data: records, error: recordsError } = await supabase
      .from('mood_records')
      .select('id, record_date, content, ai_message, timestamp_ms')
      .eq('user_id', userId)
      .order('record_date', { ascending: false });

    if (recordsError) {
      throw recordsError;
    }

    const recordIds = (records || []).map((row) => row.id).filter(Boolean);
    let emotionsMap = new Map();
    let recsMap = new Map();

    if (recordIds.length > 0) {
      const { data: emotions, error: emotionsError } = await supabase
        .from('mood_record_emotions')
        .select('mood_record_id, emotion_id')
        .in('mood_record_id', recordIds);

      if (emotionsError) {
        throw emotionsError;
      }

      emotionsMap = emotions.reduce((acc, row) => {
        const current = acc.get(row.mood_record_id) || [];
        if (!current.includes(row.emotion_id)) {
          current.push(row.emotion_id);
        }
        acc.set(row.mood_record_id, current);
        return acc;
      }, new Map());

      const { data: recs, error: recsError } = await supabase
        .from('mood_recommendations')
        .select('mood_record_id, rec_type, rec_key, title, description, link')
        .in('mood_record_id', recordIds);

      if (recsError) {
        throw recsError;
      }

      recsMap = recs.reduce((acc, row) => {
        const current = acc.get(row.mood_record_id) || [];
        current.push({
          id: row.rec_key,
          type: row.rec_type,
          title: row.title,
          desc: row.description,
          link: row.link ?? undefined,
        });
        acc.set(row.mood_record_id, current);
        return acc;
      }, new Map());
    }

    const mapped = (records || []).map((row) => ({
      id: row.id,
      date: row.record_date instanceof Date ? row.record_date.toISOString().slice(0, 10) : row.record_date,
      content: row.content || '',
      aiMessage: row.ai_message || undefined,
      timestamp: row.timestamp_ms ?? Date.now(),
      emotionIds: emotionsMap.get(row.id) || [],
      recommendations: recsMap.get(row.id) || [],
    }));

    res.json(mapped);
  } catch (err) {
    console.error('Fetch moods error:', err);
    res.status(500).send('감정 기록을 불러오지 못했어요.');
  }
});

app.post('/api/moods', async (req, res) => {
  const { userId, date, emotionIds, content, aiMessage, recommendations } = req.body || {};

  if (!userId || !date || !Array.isArray(emotionIds) || emotionIds.length === 0 || !content) {
    return res.status(400).send('필수 정보가 누락되었어요.');
  }

  try {
    const { data: existing, error: existingError } = await supabase
      .from('mood_records')
      .select('id')
      .eq('user_id', userId)
      .eq('record_date', date)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    const now = new Date();
    const nowMs = Date.now();
    let recordId = existing?.id;

    if (recordId) {
      const { error: updateError } = await supabase
        .from('mood_records')
        .update({
          content,
          ai_message: aiMessage ?? null,
          timestamp_ms: nowMs,
          updated_at: now,
        })
        .eq('id', recordId);

      if (updateError) {
        throw updateError;
      }

      const { error: deleteEmotionsError } = await supabase
        .from('mood_record_emotions')
        .delete()
        .eq('mood_record_id', recordId);

      if (deleteEmotionsError) {
        throw deleteEmotionsError;
      }

      const { error: deleteRecsError } = await supabase
        .from('mood_recommendations')
        .delete()
        .eq('mood_record_id', recordId);

      if (deleteRecsError) {
        throw deleteRecsError;
      }
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('mood_records')
        .insert({
          user_id: userId,
          record_date: date,
          external_id: crypto.randomUUID(),
          content,
          ai_message: aiMessage ?? null,
          timestamp_ms: nowMs,
          created_at: now,
          updated_at: now,
        })
        .select('id')
        .single();

      if (insertError) {
        throw insertError;
      }

      recordId = inserted.id;
    }

    if (emotionIds.length > 0) {
      const { error: insertEmotionsError } = await supabase
        .from('mood_record_emotions')
        .insert(emotionIds.map((emotionId) => ({ mood_record_id: recordId, emotion_id: emotionId })));

      if (insertEmotionsError) {
        throw insertEmotionsError;
      }
    }

    const recPayload = Array.isArray(recommendations)
      ? recommendations.map((rec) => ({
          mood_record_id: recordId,
          rec_type: rec.type,
          rec_key: rec.id,
          title: rec.title,
          description: rec.desc,
          link: rec.link ?? null,
        }))
      : [];

    if (recPayload.length > 0) {
      const { error: insertRecsError } = await supabase.from('mood_recommendations').insert(recPayload);
      if (insertRecsError) {
        throw insertRecsError;
      }
    }

    res.json({ id: recordId, date, emotionIds, content, aiMessage, recommendations: recommendations || [], timestamp: nowMs });
  } catch (err) {
    console.error('Save mood error:', err);
    res.status(500).send('감정 기록 저장에 실패했어요.');
  }
});

app.delete('/api/moods/:id', async (req, res) => {
  const recordId = Number(req.params.id);
  if (!recordId) {
    return res.status(400).send('삭제할 기록 id가 필요합니다.');
  }

  try {
    const { error: deleteEmotionsError } = await supabase
      .from('mood_record_emotions')
      .delete()
      .eq('mood_record_id', recordId);

    if (deleteEmotionsError) {
      throw deleteEmotionsError;
    }

    const { error: deleteRecordError } = await supabase.from('mood_records').delete().eq('id', recordId);

    if (deleteRecordError) {
      throw deleteRecordError;
    }

    res.status(204).end();
  } catch (err) {
    console.error('Delete mood error:', err);
    res.status(500).send('기록 삭제에 실패했어요.');
  }
});

app.get('/api/reminder', async (req, res) => {
  const userId = Number(req.query.userId);
  if (!userId) {
    return res.status(400).send('userId가 필요합니다.');
  }

  try {
    const { data, error } = await supabase
      .from('user_reminders')
      .select('reminder_time')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const reminderTime = data?.reminder_time ? String(data.reminder_time).slice(0, 5) : null;
    res.json({ reminderTime });
  } catch (err) {
    console.error('Fetch reminder error:', err);
    res.status(500).send('알림 설정을 불러오지 못했어요.');
  }
});

app.post('/api/reminder', async (req, res) => {
  const { userId, reminderTime } = req.body || {};
  if (!userId || !reminderTime) {
    return res.status(400).send('userId와 reminderTime이 필요합니다.');
  }

  const normalizedTime = reminderTime.length === 5 ? `${reminderTime}:00` : reminderTime;

  try {
    const now = new Date();

    const { data: existing, error: existingError } = await supabase
      .from('user_reminders')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('user_reminders')
        .update({ reminder_time: normalizedTime, updated_at: now })
        .eq('user_id', userId);

      if (updateError) {
        throw updateError;
      }
    } else {
      const { error: insertError } = await supabase.from('user_reminders').insert({
        user_id: userId,
        reminder_time: normalizedTime,
        created_at: now,
        updated_at: now,
      });

      if (insertError) {
        throw insertError;
      }
    }

    res.json({ reminderTime: reminderTime.slice(0, 5) });
  } catch (err) {
    console.error('Save reminder error:', err);
    res.status(500).send('알림 설정 저장에 실패했어요.');
  }
});

app.get('/api/health', async (_req, res) => {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      throw error;
    }
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
  console.log('Supabase URL:', supabaseUrl);
});
