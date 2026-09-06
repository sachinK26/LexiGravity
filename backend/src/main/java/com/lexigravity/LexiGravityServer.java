package com.lexigravity;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.Headers;

import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.util.*;
import java.util.concurrent.Executors;

public class LexiGravityServer {

    static final int PORT = 8080;
    static Connection dbConn;

    public static void main(String[] args) throws Exception {
        dbConn = DatabaseManager.initDatabase();
        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);

        server.createContext("/api/words", new WordsHandler());
        server.createContext("/api/score", new ScoreHandler());
        server.createContext("/api/leaderboard", new LeaderboardHandler());
        server.createContext("/api/analytics", new AnalyticsHandler());
        server.createContext("/api/player", new PlayerHandler());
        server.createContext("/", new StaticHandler());

        server.setExecutor(Executors.newFixedThreadPool(4));
        server.start();
        System.out.println("LexiGravity Server running on http://localhost:" + PORT);
    }

    // ---------- CORS + Response Helpers ----------
    static void addCorsHeaders(HttpExchange ex) {
        Headers h = ex.getResponseHeaders();
        h.add("Access-Control-Allow-Origin", "*");
        h.add("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
        h.add("Access-Control-Allow-Headers", "Content-Type");
    }

    static void sendJson(HttpExchange ex, int status, String json) throws IOException {
        addCorsHeaders(ex);
        ex.getResponseHeaders().add("Content-Type", "application/json");
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        ex.sendResponseHeaders(status, bytes.length);
        ex.getResponseBody().write(bytes);
        ex.getResponseBody().close();
    }

    static String readBody(HttpExchange ex) throws IOException {
        return new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
    }

    static Map<String, String> parseJson(String json) {
        Map<String, String> map = new HashMap<>();
        json = json.trim().replaceAll("[{}]", "");
        for (String pair : json.split(",")) {
            String[] kv = pair.split(":", 2);
            if (kv.length == 2) {
                String key = kv[0].trim().replaceAll("\"", "");
                String val = kv[1].trim().replaceAll("\"", "");
                map.put(key, val);
            }
        }
        return map;
    }

    // ---------- Word Lists by Difficulty ----------
    static final String[][] WORD_BANKS = {
        // Level 1 - Easy
        {"cat","dog","run","sun","hat","big","red","cup","sky","fly","art","map","net","log","box","tag","jam","ice","owl","bat"},
        // Level 2
        {"apple","brave","cloud","dream","eagle","flame","grace","honey","ivory","jolly","karma","lemon","magic","noble","ocean"},
        // Level 3
        {"anchor","bridge","castle","dancer","empire","falcon","garden","harbor","island","jungle","kaleid","legend","marvel","narrate"},
        // Level 4
        {"abstract","bracket","century","dynamic","eclipse","fantasia","gravity","harmony","imagine","jigsaw","kingdom","labyrinth"},
        // Level 5 - Hard
        {"algorithm","blueprint","chronicle","dimension","eloquence","frequency","guarantee","hierarchy","implement","javascript"},
        // Level 6 - Expert
        {"acknowledge","bibliography","consciousness","demonstration","encyclopedia","fluorescence","gravitational","hallucination"},
        // Level 7 - Master
        {"acknowledgement","biogeographical","chronologically","disproportionate","electromagnetic","formidable"},
        // Level 8 - Legendary
        {"accomplishment","circumnavigate","czechoslovakia","disappointment","establishment","infrastructure","juxtaposition"}
    };

    static String getRandomWord(int level) {
        int tier = Math.min(level - 1, WORD_BANKS.length - 1);
        String[] bank = WORD_BANKS[tier];
        return bank[new Random().nextInt(bank.length)];
    }
}

// ---------- Words Handler ----------
class WordsHandler implements HttpHandler {
    public void handle(HttpExchange ex) throws IOException {
        LexiGravityServer.addCorsHeaders(ex);
        if ("OPTIONS".equals(ex.getRequestMethod())) {
            ex.sendResponseHeaders(204, -1); return;
        }
        String query = ex.getRequestURI().getQuery();
        int level = 1;
        int count = 5;
        if (query != null) {
            for (String p : query.split("&")) {
                String[] kv = p.split("=");
                if (kv.length == 2) {
                    if ("level".equals(kv[0])) level = Integer.parseInt(kv[1]);
                    if ("count".equals(kv[0])) count = Integer.parseInt(kv[1]);
                }
            }
        }
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < count; i++) {
            if (i > 0) sb.append(",");
            sb.append("\"").append(LexiGravityServer.getRandomWord(level)).append("\"");
        }
        sb.append("]");
        LexiGravityServer.sendJson(ex, 200, sb.toString());
    }
}

// ---------- Score Handler ----------
class ScoreHandler implements HttpHandler {
    public void handle(HttpExchange ex) throws IOException {
        LexiGravityServer.addCorsHeaders(ex);
        if ("OPTIONS".equals(ex.getRequestMethod())) { ex.sendResponseHeaders(204,-1); return; }
        if ("POST".equals(ex.getRequestMethod())) {
            String body = LexiGravityServer.readBody(ex);
            Map<String,String> data = LexiGravityServer.parseJson(body);
            String name = data.getOrDefault("name","Anonymous");
            int score = Integer.parseInt(data.getOrDefault("score","0"));
            double wpm = Double.parseDouble(data.getOrDefault("wpm","0"));
            double accuracy = Double.parseDouble(data.getOrDefault("accuracy","0"));
            int maxCombo = Integer.parseInt(data.getOrDefault("maxCombo","0"));
            int wordsTyped = Integer.parseInt(data.getOrDefault("wordsTyped","0"));
            int level = Integer.parseInt(data.getOrDefault("level","1"));
            try {
                PreparedStatement ps = LexiGravityServer.dbConn.prepareStatement(
                    "INSERT INTO scores (player_name,score,wpm,accuracy,max_combo,words_typed,level_reached,played_at) VALUES (?,?,?,?,?,?,?,datetime('now'))");
                ps.setString(1, name); ps.setInt(2, score); ps.setDouble(3, wpm);
                ps.setDouble(4, accuracy); ps.setInt(5, maxCombo); ps.setInt(6, wordsTyped); ps.setInt(7, level);
                ps.executeUpdate();
                LexiGravityServer.sendJson(ex, 200, "{\"status\":\"saved\",\"score\":"+score+"}");
            } catch (Exception e) {
                LexiGravityServer.sendJson(ex, 500, "{\"error\":\""+e.getMessage()+"\"}");
            }
        }
    }
}

// ---------- Leaderboard Handler ----------
class LeaderboardHandler implements HttpHandler {
    public void handle(HttpExchange ex) throws IOException {
        LexiGravityServer.addCorsHeaders(ex);
        if ("OPTIONS".equals(ex.getRequestMethod())) { ex.sendResponseHeaders(204,-1); return; }
        try {
            Statement st = LexiGravityServer.dbConn.createStatement();
            ResultSet rs = st.executeQuery(
                "SELECT player_name,score,wpm,accuracy,max_combo,level_reached,played_at FROM scores ORDER BY score DESC LIMIT 20");
            StringBuilder sb = new StringBuilder("[");
            int rank = 1;
            boolean first = true;
            while (rs.next()) {
                if (!first) sb.append(",");
                sb.append("{");
                sb.append("\"rank\":").append(rank++).append(",");
                sb.append("\"name\":\"").append(rs.getString("player_name")).append("\",");
                sb.append("\"score\":").append(rs.getInt("score")).append(",");
                sb.append("\"wpm\":").append(String.format("%.1f", rs.getDouble("wpm"))).append(",");
                sb.append("\"accuracy\":").append(String.format("%.1f", rs.getDouble("accuracy"))).append(",");
                sb.append("\"maxCombo\":").append(rs.getInt("max_combo")).append(",");
                sb.append("\"level\":").append(rs.getInt("level_reached")).append(",");
                sb.append("\"date\":\"").append(rs.getString("played_at")).append("\"");
                sb.append("}");
                first = false;
            }
            sb.append("]");
            LexiGravityServer.sendJson(ex, 200, sb.toString());
        } catch (Exception e) {
            LexiGravityServer.sendJson(ex, 500, "{\"error\":\""+e.getMessage()+"\"}");
        }
    }
}

// ---------- Analytics Handler ----------
class AnalyticsHandler implements HttpHandler {
    public void handle(HttpExchange ex) throws IOException {
        LexiGravityServer.addCorsHeaders(ex);
        if ("OPTIONS".equals(ex.getRequestMethod())) { ex.sendResponseHeaders(204,-1); return; }
        String query = ex.getRequestURI().getQuery();
        String name = "Anonymous";
        if (query != null) {
            for (String p : query.split("&")) {
                String[] kv = p.split("=",2);
                if (kv.length == 2 && "name".equals(kv[0])) name = kv[1];
            }
        }
        try {
            PreparedStatement ps = LexiGravityServer.dbConn.prepareStatement(
                "SELECT COUNT(*) as games, MAX(score) as best_score, AVG(wpm) as avg_wpm, AVG(accuracy) as avg_acc, MAX(max_combo) as best_combo, MAX(level_reached) as best_level FROM scores WHERE player_name=?");
            ps.setString(1, name);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                String json = "{" +
                    "\"games\":" + rs.getInt("games") + "," +
                    "\"bestScore\":" + rs.getInt("best_score") + "," +
                    "\"avgWpm\":" + String.format("%.1f", rs.getDouble("avg_wpm")) + "," +
                    "\"avgAccuracy\":" + String.format("%.1f", rs.getDouble("avg_acc")) + "," +
                    "\"bestCombo\":" + rs.getInt("best_combo") + "," +
                    "\"bestLevel\":" + rs.getInt("best_level") +
                "}";
                LexiGravityServer.sendJson(ex, 200, json);
            } else {
                LexiGravityServer.sendJson(ex, 200, "{\"games\":0}");
            }
        } catch (Exception e) {
            LexiGravityServer.sendJson(ex, 500, "{\"error\":\""+e.getMessage()+"\"}");
        }
    }
}

// ---------- Player Handler ----------
class PlayerHandler implements HttpHandler {
    public void handle(HttpExchange ex) throws IOException {
        LexiGravityServer.addCorsHeaders(ex);
        if ("OPTIONS".equals(ex.getRequestMethod())) { ex.sendResponseHeaders(204,-1); return; }
        if ("POST".equals(ex.getRequestMethod())) {
            String body = LexiGravityServer.readBody(ex);
            Map<String,String> data = LexiGravityServer.parseJson(body);
            String name = data.getOrDefault("name","Anonymous");
            try {
                PreparedStatement ps = LexiGravityServer.dbConn.prepareStatement(
                    "INSERT OR IGNORE INTO players (name, created_at) VALUES (?, datetime('now'))");
                ps.setString(1, name);
                ps.executeUpdate();
                LexiGravityServer.sendJson(ex, 200, "{\"status\":\"ok\",\"name\":\""+name+"\"}");
            } catch (Exception e) {
                LexiGravityServer.sendJson(ex, 500, "{\"error\":\""+e.getMessage()+"\"}");
            }
        }
    }
}

// ---------- Static File Handler ----------
class StaticHandler implements HttpHandler {
    public void handle(HttpExchange ex) throws IOException {
        LexiGravityServer.addCorsHeaders(ex);
        String path = ex.getRequestURI().getPath();
        if ("/".equals(path)) path = "/index.html";
        InputStream is = getClass().getResourceAsStream("/static" + path);
        if (is == null) {
            String msg = "404 Not Found";
            ex.sendResponseHeaders(404, msg.length());
            ex.getResponseBody().write(msg.getBytes());
            ex.getResponseBody().close();
            return;
        }
        String ct = path.endsWith(".css") ? "text/css" :
                    path.endsWith(".js")  ? "application/javascript" : "text/html";
        ex.getResponseHeaders().add("Content-Type", ct);
        byte[] bytes = is.readAllBytes();
        ex.sendResponseHeaders(200, bytes.length);
        ex.getResponseBody().write(bytes);
        ex.getResponseBody().close();
    }
}
