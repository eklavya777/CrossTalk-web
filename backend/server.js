const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const axios = require("axios");

require("dotenv").config();

const { Pool } = require("pg");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());


// ================= SOCKET USERS =================

const users = {};

io.on("connection", (socket) => {

  console.log("User connected:", socket.id);

  socket.on("join", (firebase_uid) => {

    users[firebase_uid] = socket.id;

    console.log("Joined:", firebase_uid);

  });

  socket.on("disconnect", () => {

    console.log("User disconnected");

    for (let uid in users) {

      if (users[uid] === socket.id) {
        delete users[uid];
      }

    }

  });

});


// ================= POSTGRES =================

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "CrossTalk",
  password: "Sagitario@123",
  port: 5433,
});


// ================= ROOT =================

app.get("/", (req, res) => {
  res.send("Chat backend running");
});


// ================= UPDATE LANGUAGE =================

app.put("/api/users/language", async (req, res) => {

  try {

    const { firebase_uid, preferred_language } = req.body;

    const updated = await pool.query(
      `UPDATE users
       SET preferred_language = $1
       WHERE firebase_uid = $2
       RETURNING *`,
      [preferred_language, firebase_uid]
    );

    res.json(updated.rows[0]);

  } catch (error) {

    console.error(error);
    res.status(500).json({ error: "Server error" });

  }

});


// ================= REGISTER USER =================

app.post("/api/users/register", async (req, res) => {

  try {

    const {
      name,
      phone,
      firebase_uid,
      preferred_language
    } = req.body;

    const existingUser = await pool.query(
      "SELECT * FROM users WHERE firebase_uid = $1",
      [firebase_uid]
    );

    if (existingUser.rows.length > 0) {

      return res.json({
        message: "User already exists",
        user: existingUser.rows[0],
      });

    }

    const newUser = await pool.query(
      `INSERT INTO users
      (name, phone, firebase_uid, preferred_language)
      VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [
        name,
        phone,
        firebase_uid,
        preferred_language
      ]
    );

    res.json({
      message: "User created",
      user: newUser.rows[0],
    });

  } catch (error) {

    console.error(error);
    res.status(500).json({ error: "Server error" });

  }

});


// ================= CHECK USER =================

app.get("/api/users/check/:phone", async (req, res) => {

  try {

    const { phone } = req.params;

    const user = await pool.query(
      "SELECT * FROM users WHERE phone=$1",
      [phone]
    );

    res.json({
      exists: user.rows.length > 0
    });

  } catch (error) {

    console.error(error);
    res.status(500).json({ error: "Server error" });

  }

});


// ================= LOGIN =================

app.get("/api/users/login/:uid", async (req, res) => {

  try {

    const { uid } = req.params;

    const user = await pool.query(
      "SELECT * FROM users WHERE firebase_uid=$1",
      [uid]
    );

    res.json(user.rows[0]);

  } catch (error) {

    console.error(error);
    res.status(500).json({ error: "Server error" });

  }

});


// ================= GET FRIENDS =================

app.get("/api/friends/:uid", async (req, res) => {

  try {

    const { uid } = req.params;

    const friends = await pool.query(
      "SELECT * FROM friends WHERE user_uid = $1",
      [uid]
    );

    res.json(friends.rows);

  } catch (error) {

    console.error(error);
    res.status(500).json({ error: "Server error" });

  }

});


app.get("/api/users/search/:phone", async (req, res) => {

  try {

    const { phone } = req.params;

    const user = await pool.query(
      "SELECT name, firebase_uid FROM users WHERE phone = $1",
      [phone]
    );

    if (user.rows.length === 0) {
      return res.json({ message: "User not found" });
    }

    res.json(user.rows[0]);

  } catch (error) {

    console.error(error);
    res.status(500).json({ error: "Server error" });

  }

});


// ================= ADD FRIEND =================

app.post("/api/friends/add", async (req, res) => {

  try {

    const { user_uid, friend_uid } = req.body;

    const sender = await pool.query(
      "SELECT name FROM users WHERE firebase_uid=$1",
      [user_uid]
    );

    const receiver = await pool.query(
      "SELECT name FROM users WHERE firebase_uid=$1",
      [friend_uid]
    );

    const senderName = sender.rows[0].name;
    const receiverName = receiver.rows[0].name;

    // user -> friend
    await pool.query(
      `INSERT INTO friends
      (user_uid, friend_uid, friend_name)
      VALUES ($1,$2,$3)
      ON CONFLICT DO NOTHING`,
      [user_uid, friend_uid, receiverName]
    );

    // friend -> user
    await pool.query(
      `INSERT INTO friends
      (user_uid, friend_uid, friend_name)
      VALUES ($1,$2,$3)
      ON CONFLICT DO NOTHING`,
      [friend_uid, user_uid, senderName]
    );

    res.json({
      message: "Friend added"
    });

  } catch (error) {

    console.error(error);
    res.status(500).json({ error: "Server error" });

  }

});


// ================= GET MESSAGES =================

app.get("/api/messages/:user1/:user2", async (req, res) => {

  try {

    const { user1, user2 } = req.params;
    const { lang } = req.query;

    const messages = await pool.query(
      `SELECT * FROM messages
       WHERE (sender_uid = $1 AND receiver_uid = $2)
       OR (sender_uid = $2 AND receiver_uid = $1)
       ORDER BY created_at ASC`,
      [user1, user2]
    );

    const finalMessages = [];

    for (let msg of messages.rows) {

      let text = msg.message_text;

      if (msg.message_language !== lang) {

        const cached = await pool.query(
          `SELECT translated_text
           FROM translated_messages
           WHERE message_id = $1
           AND target_language = $2`,
          [msg.id, lang]
        );

        if (cached.rows.length > 0) {

          text = cached.rows[0].translated_text;

        } else {

          const translation = await axios.post(
            "https://api-free.deepl.com/v2/translate",
            new URLSearchParams({
              text: msg.message_text,
              source_lang: msg.message_language.toUpperCase(),
              target_lang: lang.toUpperCase()
            }),
            {
              headers: {
                "Authorization": `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
                "Content-Type": "application/x-www-form-urlencoded"
              }
            }
          );

          text = translation.data.translations[0].text;

          await pool.query(
            `INSERT INTO translated_messages
            (message_id, target_language, translated_text)
            VALUES ($1,$2,$3)`,
            [msg.id, lang, text]
          );
        }
      }

      finalMessages.push({
        ...msg,
        message_text: text
      });

    }

    res.json(finalMessages);

  } catch (error) {

    console.error(error);
    res.status(500).json({ error: "Server error" });

  }

});


// ================= SEND MESSAGE =================

app.post("/api/messages/send", async (req, res) => {

  try {

    const {
      sender_uid,
      receiver_uid,
      message_text,
      message_language
    } = req.body;

    // save original message
    const newMessage = await pool.query(
      `INSERT INTO messages
      (sender_uid, receiver_uid, message_text, message_language)
      VALUES ($1,$2,$3,$4)
      RETURNING *`,
      [
        sender_uid,
        receiver_uid,
        message_text,
        message_language
      ]
    );

    const message = newMessage.rows[0];

    // get receiver language
    const receiverLang = await pool.query(
      `SELECT preferred_language
       FROM users
       WHERE firebase_uid = $1`,
      [receiver_uid]
    );

    const target_language =
      receiverLang.rows[0]?.preferred_language || "en";

    let translatedText = message_text;

    // translate if needed
    if (message_language !== target_language) {

      const cached = await pool.query(
        `SELECT translated_text
         FROM translated_messages
         WHERE message_id = $1
         AND target_language = $2`,
        [message.id, target_language]
      );

      if (cached.rows.length > 0) {

        translatedText = cached.rows[0].translated_text;

      } else {

        const translation = await axios.post(
          "https://api-free.deepl.com/v2/translate",
          new URLSearchParams({
            text: message_text,
            source_lang: message_language.toUpperCase(),
            target_lang: target_language.toUpperCase()
          }),
          {
            headers: {
              "Authorization":
                `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
              "Content-Type":
                "application/x-www-form-urlencoded"
            }
          }
        );

        translatedText =
          translation.data.translations[0].text;

        await pool.query(
          `INSERT INTO translated_messages
          (message_id, target_language, translated_text)
          VALUES ($1,$2,$3)`,
          [message.id, target_language, translatedText]
        );

      }

    }

    // ================= REALTIME SOCKET =================

    const receiverSocketId = users[receiver_uid];

    if (receiverSocketId) {

      io.to(receiverSocketId).emit(
        "receive_message",
        {
          ...message,
          message_text: translatedText
        }
      );

    }

    res.json({
      ...message,
      message_text: translatedText
    });

  } catch (error) {

    console.error(error);
    res.status(500).json({ error: "Server error" });

  }

});


// ================= START SERVER =================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});