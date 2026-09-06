package com.lexigravity;

import java.sql.*;

public class DatabaseManager {

    public static Connection initDatabase() throws Exception {
        // Load SQLite JDBC (bundled)
        Class.forName("org.sqlite.JDBC");
        Connection conn = DriverManager.getConnection("jdbc:sqlite:lexigravity.db");

        Statement st = conn.createStatement();

        st.execute("""
            CREATE TABLE IF NOT EXISTS players (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                created_at TEXT
            )
        """);

        st.execute("""
            CREATE TABLE IF NOT EXISTS scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_name TEXT NOT NULL,
                score INTEGER NOT NULL,
                wpm REAL,
                accuracy REAL,
                max_combo INTEGER,
                words_typed INTEGER,
                level_reached INTEGER,
                played_at TEXT
            )
        """);

        st.execute("CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC)");
        st.execute("CREATE INDEX IF NOT EXISTS idx_scores_player ON scores(player_name)");

        System.out.println("Database initialized: lexigravity.db");
        return conn;
    }
}
