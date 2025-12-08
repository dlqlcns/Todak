-- Railway MySQL schema for Todak
-- Uses external connection string: ${MySQL.MYSQL_URL}

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  login_id VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mood_records (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  external_id VARCHAR(255),
  record_date DATE NOT NULL,
  content TEXT,
  ai_message TEXT,
  timestamp_ms BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS mood_record_emotions (
  mood_record_id BIGINT UNSIGNED NOT NULL,
  emotion_id VARCHAR(64) NOT NULL,
  PRIMARY KEY (mood_record_id, emotion_id),
  FOREIGN KEY (mood_record_id) REFERENCES mood_records(id)
);
