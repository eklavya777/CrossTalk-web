  import express from "express";
  import cors from "cors";
  import dotenv from "dotenv";
  import pg from "pg";
  import axios from "axios";

  import { createServer } from "http";
  import { Server } from "socket.io";

  const { Pool } = pg;

  dotenv.config();

  const app = express();

  const server = createServer(app);

  /* ================= SOCKET.IO ================= */

  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ["GET", "POST"]
    }
  });

  /* ================= MIDDLEWARE ================= */

  app.use(express.json());

  app.use(
    cors({
      origin: process.env.CLIENT_URL,
      credentials: true
    })
  );

  /* ================= POSTGRES ================= */

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  /* ================= SOCKET CONNECTION ================= */

  io.on("connection", (socket) => {

    console.log("User connected");

    socket.on("join", (firebase_uid) => {

      socket.join(firebase_uid);

      console.log(`${firebase_uid} joined`);

    });

    socket.on("disconnect", () => {

      console.log("User disconnected");

    });

  });

  /* ================= TRANSLATE FUNCTION ================= */

  async function translateText(text, targetLang) {

    try {

      const response = await axios.post(
        "https://api-free.deepl.com/v2/translate",
        null,
        {
          params: {
            auth_key: process.env.DEEPL_API_KEY,
            text: text,
            target_lang: targetLang.toUpperCase()
          }
        }
      );

      return response.data.translations[0].text;

    } catch (error) {

      console.log(error.response?.data || error.message);

      return text;

    }

  }

  /* ================= TEST ROUTE ================= */

  app.get("/", (req, res) => {

    res.send("CrossTalk backend running");

  });

  /* ================= SIGNUP ================= */

  /* ================= SIGNUP ================= */

  /* ================= SIGNUP ================= */

  app.post("/api/users/register", async (req, res) => {

    try {

      const {
        firebase_uid,
        name,
        phone,
        preferred_language
      } = req.body;

      // CHECK EXISTING USER
      const existingUser = await pool.query(
        `
        SELECT *
        FROM users
        WHERE phone=$1
        `,
        [phone]
      );

      // USER ALREADY EXISTS
      if (existingUser.rows.length > 0) {

        return res.status(409).json({
          error: "User already exists. Please login."
        });

      }

      // INSERT NEW USER
      const result = await pool.query(
        `
        INSERT INTO users
        (
          firebase_uid,
          name,
          phone,
          preferred_language
        )
        VALUES ($1,$2,$3,$4)
        RETURNING *
        `,
        [
          firebase_uid,
          name,
          phone,
          preferred_language
        ]
      );

      // IMPORTANT
      res.json({
        success: true,
        user: result.rows[0]
      });

    } catch (error) {

      console.log("SIGNUP ERROR:", error);

      res.status(500).json({
        error: "Signup failed"
      });

    }

  });
  /* ================= LOGIN ================= */

  app.get("/api/users/login/:firebase_uid", async (req, res) => {

    try {

      const { firebase_uid } = req.params;

      const result = await pool.query(
        `
        SELECT *
        FROM users
        WHERE firebase_uid=$1
        `,
        [firebase_uid]
      );

      if (result.rows.length === 0) {

        return res.status(404).json({
          error: "User not found"
        });

      }

      res.json(result.rows[0]);

    } catch (error) {

      console.log(error);

      res.status(500).json({
        error: "Login failed"
      });

    }

  });
  /* ================= SEARCH USER ================= */

  app.get("/api/users/search/:phone", async (req, res) => {

    try {

      const { phone } = req.params;

      const result = await pool.query(
        `
        SELECT *
        FROM users
        WHERE phone=$1
        `,
        [phone]
      );

      res.json(result.rows[0] || {});

    } catch (error) {

      console.log(error);

      res.status(500).json({
        error: "Search failed"
      });

    }

  });

  /* ================= ADD FRIEND ================= */

  /* ================= ADD FRIEND ================= */

app.post("/api/friends/add", async (req, res) => {

  try {

    const {
      user_uid,
      friend_uid,
      friend_name,
      user_name
    } = req.body;

    // CHECK IF ALREADY EXISTS
    const existing1 = await pool.query(
      `
      SELECT *
      FROM friends
      WHERE user_uid=$1
      AND friend_uid=$2
      `,
      [user_uid, friend_uid]
    );

    if (existing1.rows.length === 0) {

      await pool.query(
        `
        INSERT INTO friends
        (
          user_uid,
          friend_uid,
          friend_name
        )
        VALUES ($1,$2,$3)
        `,
        [
          user_uid,
          friend_uid,
          friend_name
        ]
      );

    }

    // REVERSE ENTRY
    const existing2 = await pool.query(
      `
      SELECT *
      FROM friends
      WHERE user_uid=$1
      AND friend_uid=$2
      `,
      [friend_uid, user_uid]
    );

    if (existing2.rows.length === 0) {

      await pool.query(
        `
        INSERT INTO friends
        (
          user_uid,
          friend_uid,
          friend_name
        )
        VALUES ($1,$2,$3)
        `,
        [
          friend_uid,
          user_uid,
          user_name
        ]
      );

    }

    res.json({
      success: true
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: "Add friend failed"
    });

  }

});

  /* ================= GET FRIENDS ================= */

  app.get("/api/friends/:user_uid", async (req, res) => {

    try {

      const { user_uid } = req.params;

      const result = await pool.query(
        `
        SELECT *
        FROM friends
        WHERE user_uid=$1
        `,
        [user_uid]
      );

      res.json(result.rows);

    } catch (error) {

      console.log(error);

      res.status(500).json({
        error: "Fetch friends failed"
      });

    }

  });

  /* ================= SEND MESSAGE ================= */


app.post("/api/messages/send", async (req, res) => {

  try {

    const {
      sender_uid,
      receiver_uid,
      message_text,
      message_language
    } = req.body;

    // SAVE ORIGINAL MESSAGE
    const result = await pool.query(
      `
      INSERT INTO messages
      (
        sender_uid,
        receiver_uid,
        message_text,
        message_language
      )
      VALUES ($1,$2,$3,$4)
      RETURNING *
      `,
      [
        sender_uid,
        receiver_uid,
        message_text,
        message_language
      ]
    );

    const message = result.rows[0];

    // GET RECEIVER LANGUAGE
    const receiverResult =
      await pool.query(
        `
        SELECT preferred_language
        FROM users
        WHERE firebase_uid=$1
        `,
        [receiver_uid]
      );

    const receiverLanguage =
      receiverResult.rows[0]
        ?.preferred_language || "en";

    let translatedMessage =
      message.message_text;

    // TRANSLATE ONLY IF LANGUAGES DIFFER
    if (
      receiverLanguage.toLowerCase() !==
      message_language.toLowerCase()
    ) {

      try {

        console.log(
          "TRANSLATING:",
          message_text
        );

        const translation =
          await axios.post(

            "https://api-free.deepl.com/v2/translate",

            new URLSearchParams({

              text: message_text,

              source_lang:
                message_language.toUpperCase(),

              target_lang:
                receiverLanguage.toUpperCase()

            }),

            {

              headers: {

                Authorization:
                  `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,

                "Content-Type":
                  "application/x-www-form-urlencoded"

              }

            }

          );

        translatedMessage =
          translation
            .data
            .translations[0]
            .text;

        console.log(
          "TRANSLATED:",
          translatedMessage
        );

        // STORE TRANSLATED MESSAGE
        await pool.query(
          `
          INSERT INTO translated_messages
          (
            message_id,
            target_language,
            translated_text
          )
          VALUES ($1,$2,$3)
          `,
          [
            message.id,
            receiverLanguage,
            translatedMessage
          ]
        );

      } catch (translationError) {

        console.log(
          "TRANSLATION ERROR:",
          translationError.response?.data ||
          translationError.message
        );

      }

    }

    // EMIT TO RECEIVER
    io.to(receiver_uid).emit(
      "receive_message",
      {
        ...message,
        message_text: translatedMessage
      }
    );

    // EMIT ORIGINAL TO SENDER
    io.to(sender_uid).emit(
      "receive_message",
      message
    );

    res.json(message);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: "Send message failed"
    });

  }

});

  /* ================= GET MESSAGES ================= */
 /* ================= GET MESSAGES ================= */
/* ================= GET MESSAGES ================= */

app.get(
  "/api/messages/:sender_uid/:receiver_uid",
  async (req, res) => {

    try {

      const {
        sender_uid,
        receiver_uid
      } = req.params;

      const lang = req.query.lang || "en";

      const result = await pool.query(
        `
        SELECT *
        FROM messages
        WHERE
        (
          sender_uid=$1
          AND receiver_uid=$2
        )
        OR
        (
          sender_uid=$2
          AND receiver_uid=$1
        )
        ORDER BY created_at ASC
        `,
        [
          sender_uid,
          receiver_uid
        ]
      );

      const translatedMessages =
        await Promise.all(

          result.rows.map(async (msg) => {

            try {

              // SAME LANGUAGE
              if (
                msg.message_language.toLowerCase() ===
                lang.toLowerCase()
              ) {

                return msg;

              }

              console.log(
                "SOURCE:",
                msg.message_language
              );

              console.log(
                "TARGET:",
                lang
              );

              console.log(
                "TEXT:",
                msg.message_text
              );

              // CHECK CACHE FIRST
              const cached =
                await pool.query(
                  `
                  SELECT translated_text
                  FROM translated_messages
                  WHERE
                  message_id=$1
                  AND target_language=$2
                  `,
                  [
                    msg.id,
                    lang
                  ]
                );

              // RETURN CACHED VERSION
              if (cached.rows.length > 0) {

                console.log(
                  "USING CACHED TRANSLATION"
                );

                return {
                  ...msg,
                  message_text:
                    cached.rows[0].translated_text
                };

              }

              // DEEPL TRANSLATION
              const translation =
                await axios.post(

                  "https://api-free.deepl.com/v2/translate",

                  new URLSearchParams({

                    text:
                      msg.message_text,

                    source_lang:
                      msg.message_language.toUpperCase(),

                    target_lang:
                      lang.toUpperCase()

                  }),

                  {

                    headers: {

                      Authorization:
                        `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,

                      "Content-Type":
                        "application/x-www-form-urlencoded"

                    }

                  }

                );

              const translatedText =
                translation
                  .data
                  .translations[0]
                  .text;

              console.log(
                "TRANSLATED:",
                translatedText
              );

              // SAVE TO CACHE TABLE
              await pool.query(
                `
                INSERT INTO translated_messages
                (
                  message_id,
                  target_language,
                  translated_text
                )
                VALUES ($1,$2,$3)
                `,
                [
                  msg.id,
                  lang,
                  translatedText
                ]
              );

              return {
                ...msg,
                message_text: translatedText
              };

            } catch (translationError) {

              console.log(
                "TRANSLATION ERROR:",
                translationError.response?.data ||
                translationError.message
              );

              return msg;

            }

          })

        );

      res.json(translatedMessages);

    } catch (error) {

      console.log(error);

      res.status(500).json({
        error: "Fetch messages failed"
      });

    }

  }
);
  /* ================= UPDATE LANGUAGE ================= */

  app.put("/api/users/language", async (req, res) => {

    try {

      const {
        firebase_uid,
        preferred_language
      } = req.body;

      await pool.query(
        `
        UPDATE users
        SET preferred_language=$1
        WHERE firebase_uid=$2
        `,
        [
          preferred_language,
          firebase_uid
        ]
      );

      res.json({
        success: true
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({
        error: "Language update failed"
      });

    }

  });

  /* ================= START SERVER ================= */

  const PORT = process.env.PORT || 5000;

  server.listen(PORT, () => {

    console.log(`Server running on ${PORT}`);

  });