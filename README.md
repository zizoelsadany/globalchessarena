# Global Chess Arena

Global Chess Arena is a full-stack real-time chess MVP built with React, Node.js, Express, Socket.IO, MySQL, `chess.js`, and `react-chessboard`.

## Features

- User registration and login with JWT authentication
- bcrypt password hashing
- Responsive dark/light React UI
- Dashboard, online players, matchmaking, game room, profile, match history, and leaderboard
- Real-time online status with Socket.IO
- Real-time matchmaking and private game rooms
- Legal move validation with `chess.js`
- Turn management, check, checkmate, stalemate, draw detection
- 10 minute clocks for each player
- Match and move persistence in MySQL
- Elo updates after completed games

## Project Structure

```text
client/
  src/
    pages/
    components/
    services/
    hooks/
    context/
    routes/
    assets/
server/
  controllers/
  routes/
  middleware/
  models/
  sockets/
  config/
  database/
  utils/
```

## Requirements

- Node.js 20+
- MySQL 8+
- npm

## Setup

1. Install dependencies:

```bash
npm run install:all
```

2. Create the MySQL database and tables:

```bash
mysql -u root -p < server/database/schema.sql
```

3. Configure environment files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Update `server/.env` with your MySQL credentials and a long random `JWT_SECRET`.

4. Start both apps:

```bash
npm run dev
```

The client runs at `http://localhost:5173`.
The API and Socket.IO server run at `http://localhost:5000`.

## API Routes

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Users

- `GET /api/users/leaderboard`
- `GET /api/users/:id`
- `PATCH /api/users/me/profile`

### Matches

- `GET /api/matches/mine`
- `GET /api/matches/:id`

## Socket Events

Client emits:

- `findMatch`
- `joinRoom`
- `movePiece`

Server emits:

- `userOnline`
- `onlinePlayers`
- `matchmakingStatus`
- `matchFound`
- `gameUpdate`
- `playerDisconnected`
- `gameEnd`
- `socketError`

## Local Testing Flow

1. Register two users in two different browsers or one browser plus an incognito window.
2. Open Matchmaking for both users.
3. Start a match and play moves on the generated game room.
4. Finish the game by checkmate, stalemate, draw, timeout, or disconnect.
5. Review saved results in Match History and rating changes on the Leaderboard.

## Production Notes

- Replace the development JWT secret before deploying.
- Use HTTPS and set strict CORS origins.
- Put the API behind a process manager such as PM2 or a container runtime.
- Run MySQL backups and migrations through your deployment pipeline.
- Consider Redis for multi-instance Socket.IO rooms, queues, and online presence.

## Railway Deployment

This repo includes `railway.json` for a single Railway service. Railway will install the server and client dependencies, build the React app, and start the Express server. In production, Express serves `client/dist` and the API from the same domain.

Required Railway variables:

- `NODE_ENV=production`
- `JWT_SECRET=your-long-random-secret`

Database variables are read automatically from Railway MySQL if you attach a MySQL service. The app supports either `DATABASE_URL` / `MYSQL_URL`, or Railway's separate variables: `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, and `MYSQLDATABASE`.

After creating the MySQL database, import `server/database/schema.sql` once to create the tables.
