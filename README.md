HEAD
# LexiGravity
# ⌨️ LEXIGRAVITY — Type or Fall

> A dynamic gravity-based typing game with adaptive difficulty, combo multipliers, power-ups, and a global leaderboard.

**Team:** Ashwin K (24PC04) · Sachin Saravan K (24PC31)

---

## 🏗️ Project Structure

```
lexigravity/
├── backend/
│   ├── src/main/java/com/lexigravity/
│   │   ├── LexiGravityServer.java   ← Main HTTP server + all API endpoints
│   │   └── DatabaseManager.java     ← SQLite initialization
│   ├── MANIFEST.MF
│   └── build.sh                     ← Build script (downloads SQLite JDBC, compiles, packages JAR)
├── frontend/
│   ├── index.html                   ← Full game UI (Home, Game, Leaderboard, Game Over)
│   ├── style.css                    ← Cyberpunk neon aesthetic stylesheet
│   └── game.js                      ← Full game engine (adaptive difficulty, combos, power-ups)
├── run.sh
└── README.md
```

---

## 🚀 Quick Start

### Step 1 — Build the Backend

```bash
cd backend
chmod +x build.sh
./build.sh
```

This will:
1. Download the SQLite JDBC driver automatically
2. Compile all Java source files
3. Package everything into `LexiGravity.jar`

> **Requirements:** Java 17+ (uses `HttpServer` from JDK — no external web framework needed)

### Step 2 — Run the Server

```bash
cd backend
java -cp "LexiGravity.jar:sqlite-jdbc.jar:slf4j-api.jar:slf4j-simple.jar" com.lexigravity.LexiGravityServer
```

You should see:
```
Database initialized: lexigravity.db
LexiGravity Server running on http://localhost:8080
```

### Step 3 — Open the Game

Open `frontend/index.html` directly in your browser, **or** visit `http://localhost:8080` (the server also serves static files).

---

## 🎮 Features

| Feature | Description |
|---|---|
| **Adaptive Difficulty** | Speed and word complexity increase as you improve — levels 1–8 |
| **Combo Multiplier** | Up to x10 score multiplier for consecutive correct words |
| **Power-Ups** | 🐌 Slow Motion (5s) · ❄️ Word Freeze (3s) · 💥 Clear Screen |
| **Global Leaderboard** | Top 20 scores stored in SQLite, displayed in real-time |
| **Real-Time Analytics** | WPM · Accuracy · Reaction tracking · Best combo |
| **3 Lives System** | Lose a life each time a word falls below the danger line |
| **Particle Effects** | Animated cyberpunk particle background |
| **Glitch Animations** | Logo glitch effects, neon glow, screen flashes |

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/words?level=N&count=N` | Get random words for a difficulty level |
| `POST` | `/api/score` | Save a game result |
| `GET` | `/api/leaderboard` | Get top 20 scores |
| `GET` | `/api/analytics?name=X` | Get personal stats for a player |
| `POST` | `/api/player` | Register/upsert a player |

### POST /api/score body:
```json
{
  "name": "Ashwin",
  "score": 4200,
  "wpm": 65.5,
  "accuracy": 92.0,
  "maxCombo": 14,
  "wordsTyped": 38,
  "level": 4
}
```

---

## 🗃️ Database Schema

```sql
-- Players table
CREATE TABLE players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  created_at TEXT
);

-- Scores table
CREATE TABLE scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  wpm REAL,
  accuracy REAL,
  max_combo INTEGER,
  words_typed INTEGER,
  level_reached INTEGER,
  played_at TEXT
);
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5 · CSS3 · Vanilla JavaScript |
| **Backend** | Java (JDK built-in `com.sun.net.httpserver`) |
| **Database** | SQLite via `sqlite-jdbc` |
| **Fonts** | Orbitron · Space Mono · Rajdhani (Google Fonts) |

---

## 📦 Dependencies

- **Java 17+** (only standard library used — no Spring, no Maven)
- **sqlite-jdbc-3.45.1.0.jar** (auto-downloaded by `build.sh`)

---

## 🐛 Troubleshooting

**`build.sh` can't download the JAR?**  
Manually download from: https://github.com/xerial/sqlite-jdbc/releases  
Place `sqlite-jdbc.jar` in the `backend/` folder, then re-run `build.sh`.

**Frontend can't reach the API?**  
Make sure the Java server is running on port 8080. The frontend uses `http://localhost:8080/api`.

**Port 8080 already in use?**  
Change `PORT = 8080` in `LexiGravityServer.java` and rebuild.
9c9bf76 (Initial commit)
