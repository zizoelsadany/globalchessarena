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
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_elo_rating (elo_rating)
);

CREATE TABLE IF NOT EXISTS matches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  white_player INT NOT NULL,
  black_player INT NOT NULL,
  winner INT NULL,
  result ENUM('white_win', 'black_win', 'draw', 'abandoned') NULL,
  start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_time DATETIME NULL,
  FOREIGN KEY (white_player) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (black_player) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (winner) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_matches_white_player (white_player),
  INDEX idx_matches_black_player (black_player),
  INDEX idx_matches_end_time (end_time)
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

CREATE TABLE IF NOT EXISTS tournaments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  status ENUM('upcoming', 'active', 'completed', 'cancelled') NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL
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
