CREATE DATABASE IF NOT EXISTS global_chess_arena
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE global_chess_arena;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(32) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  elo_rating INT NOT NULL DEFAULT 0,
  invite_code CHAR(6) UNIQUE,
  avatar VARCHAR(500),
  role ENUM('player', 'admin') NOT NULL DEFAULT 'player',
  status ENUM('active', 'banned') NOT NULL DEFAULT 'active',
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  otp_code VARCHAR(6) NULL,
  otp_expires_at DATETIME NULL,
  is_premium TINYINT(1) NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  xp INT NOT NULL DEFAULT 0,
  coins INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_elo_rating (elo_rating)
);

CREATE TABLE IF NOT EXISTS tournaments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  status ENUM('upcoming', 'active', 'completed', 'cancelled') NOT NULL DEFAULT 'upcoming',
  max_participants INT NOT NULL DEFAULT 64,
  logo_url VARCHAR(500) NULL,
  style_color VARCHAR(50) NOT NULL DEFAULT '#7cc96f',
  ends_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS matches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  white_player INT NOT NULL,
  black_player INT NOT NULL,
  winner INT NULL,
  result ENUM('white_win', 'black_win', 'draw', 'abandoned') NULL,
  reason ENUM('resign', 'timeout', 'disconnect', 'stalemate', 'draw', 'checkmate', 'finished', 'abandoned') NULL,
  start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_time DATETIME NULL,
  tournament_id INT NULL,
  scheduled_time DATETIME NULL,
  FOREIGN KEY (white_player) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (black_player) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (winner) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  INDEX idx_matches_white_player (white_player),
  INDEX idx_matches_black_player (black_player),
  INDEX idx_matches_end_time (end_time),
  INDEX idx_matches_tournament_id (tournament_id)
);

CREATE TABLE IF NOT EXISTS moves (
  id INT AUTO_INCREMENT PRIMARY KEY,
  match_id INT NOT NULL,
  move_notation VARCHAR(24) NOT NULL,
  move_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  INDEX idx_moves_match_id (match_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reporter_id INT NOT NULL,
  reported_user_id INT NULL,
  type ENUM('player', 'problem') NOT NULL,
  message TEXT NOT NULL,
  status ENUM('open', 'reviewed', 'resolved') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_reports_status (status)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tournament_participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tournament_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_tournament_user (tournament_id, user_id)
);

CREATE TABLE IF NOT EXISTS email_queue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  html TEXT NOT NULL,
  status ENUM('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS archived_matches (
  id INT PRIMARY KEY,
  white_player INT NOT NULL,
  black_player INT NOT NULL,
  winner INT NULL,
  result ENUM('white_win', 'black_win', 'draw', 'abandoned') NULL,
  reason ENUM('resign', 'timeout', 'disconnect', 'stalemate', 'draw', 'checkmate', 'finished', 'abandoned') NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NULL,
  tournament_id INT NULL,
  scheduled_time DATETIME NULL,
  archived_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS archived_moves (
  id INT PRIMARY KEY,
  match_id INT NOT NULL,
  move_notation VARCHAR(24) NOT NULL,
  move_time DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS friends (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  friend_id INT NOT NULL,
  status ENUM('pending', 'accepted') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_friendship (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  status VARCHAR(50) NOT NULL,
  stripe_session_id VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_puzzle_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  puzzle_id INT NOT NULL,
  solved_at DATE NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_analysis_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  match_id INT NOT NULL,
  requested_at DATE NOT NULL,
  is_deleted TINYINT(1) DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

