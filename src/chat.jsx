import React, { useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";

import "./chat.css";

const socket = io(import.meta.env.VITE_BACKEND_URL);

function Chat() {

  const user = JSON.parse(localStorage.getItem("user"));

  const [message, setMessage] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);

  // MOBILE CHAT SCREEN CONTROL
  const [showMobileChat, setShowMobileChat] = useState(false);

  // initialize language from user
  const [language, setLanguage] = useState(
    user.preferred_language || "en"
  );


  // ================= INITIAL LOAD =================

  useEffect(() => {

    fetchFriends();

    // join socket room
    socket.emit("join", user.firebase_uid);

  }, []);


  // ================= REALTIME SOCKET =================

  useEffect(() => {

    socket.on("receive_message", (data) => {

      // only append if current chat is open
      if (
        selectedFriend &&
        (
          data.sender_uid === selectedFriend.friend_uid ||
          data.receiver_uid === selectedFriend.friend_uid
        )
      ) {

        setMessages((prev) => [...prev, data]);

      }

    });

    return () => {
      socket.off("receive_message");
    };

  }, [selectedFriend]);


  // ================= LANGUAGE CHANGE =================

  useEffect(() => {

    if (selectedFriend) {
      openChat(selectedFriend);
    }

  }, [language]);


  // ================= FETCH FRIENDS =================

  const fetchFriends = async () => {

    try {

      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/friends/${user.firebase_uid}`
      );

      setFriends(res.data);

    } catch (error) {

      console.log(error);

    }

  };


  // ================= SEARCH USER =================

  const searchUser = async () => {

    try {

      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/users/search/${searchPhone}`
      );

      const friend = res.data;

      if (!friend.firebase_uid) {

        alert("User not found");
        return;

      }

      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/friends/add`,
        {
          user_uid: user.firebase_uid,
          friend_uid: friend.firebase_uid,
          friend_name: friend.name
        }
      );

      fetchFriends();

      setSearchPhone("");

    } catch (error) {

      console.log(error);

    }

  };


  // ================= OPEN CHAT =================

  const openChat = async (friend) => {

    setSelectedFriend(friend);

    // MOBILE VIEW
    if (window.innerWidth <= 900) {
      setShowMobileChat(true);
    }

    try {

      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/messages/${user.firebase_uid}/${friend.friend_uid}?lang=${language}`
      );

      setMessages(res.data);

    } catch (error) {

      console.log(error);

    }

  };


  // ================= SEND MESSAGE =================

  const sendMessage = async () => {

    if (!message || !selectedFriend) return;

    try {

      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/messages/send`,
        {
          sender_uid: user.firebase_uid,
          receiver_uid: selectedFriend.friend_uid,
          message_text: message,
          message_language: language,
        }
      );

      setMessage("");

      // reload sender messages properly
      await openChat(selectedFriend);

    } catch (error) {

      console.log(error);

    }

  };


  // ================= CHANGE LANGUAGE =================

  const changeLanguage = async (newLang) => {

    setLanguage(newLang);

    try {

      await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/api/users/language`,
        {
          firebase_uid: user.firebase_uid,
          preferred_language: newLang
        }
      );

      const updatedUser = {
        ...user,
        preferred_language: newLang
      };

      localStorage.setItem(
        "user",
        JSON.stringify(updatedUser)
      );

    } catch (error) {

      console.log(error);

    }

  };


  return (

    <div className="chat-container">

      {/* ================= SIDEBAR ================= */}

      <div
        className={`sidebar ${
          showMobileChat ? "hide-mobile" : ""
        }`}
      >

        <div className="sidebar-header">
          <h3>{user.name}</h3>
        </div>


        {/* SEARCH */}

        <div className="search-box">

          <input
            className="search-bar"
            placeholder="Search phone number..."
            value={searchPhone}
            onChange={(e)=>setSearchPhone(e.target.value)}
          />

          <button onClick={searchUser}>
            Add
          </button>

        </div>


        {/* FRIEND LIST */}

        <div className="chat-list">

          {friends.map((f)=>(

            <div
              key={f.id}
              className={
                selectedFriend?.friend_uid === f.friend_uid
                  ? "chat-user active"
                  : "chat-user"
              }
              onClick={()=>openChat(f)}
            >

              <div className="user-avatar">
                {f.friend_name.charAt(0).toUpperCase()}
              </div>

              <span className="user-name">{f.friend_name}</span>

            </div>

          ))}

        </div>

      </div>


      {/* ================= CHAT WINDOW ================= */}

      <div
        className={`chat-window ${
          showMobileChat ? "show-mobile-chat" : ""
        }`}
      >


        {/* ================= TOP HEADER ================= */}

        <div className="chat-header">

          <div className="chat-header-left">

            {/* MOBILE BACK BUTTON */}

            {showMobileChat && (

              <button
                className="mobile-back-btn"
                onClick={() => setShowMobileChat(false)}
              >
                ←
              </button>

            )}

            <div className="chat-header-title">

              {
                selectedFriend
                ? selectedFriend.friend_name
                : "Select a user"
              }

            </div>

          </div>


          {/* LANGUAGE SELECTOR */}

          <select
            className="language-select"
            value={language}
            onChange={(e)=>changeLanguage(e.target.value)}
          >

            <option value="en">English</option>
            <option value="ja">Japanese</option>
            <option value="hi">Hindi</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>

          </select>

        </div>


        {/* ================= MESSAGES ================= */}

        <div className="chat-messages">

          {messages.map((msg)=>(

            <div
              key={msg.id}
              className={
                msg.sender_uid === user.firebase_uid
                ? "my-message"
                : "friend-message"
              }
            >

              {msg.message_text}

            </div>

          ))}

        </div>


        {/* ================= INPUT ================= */}

        <div className="chat-input">

          <input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e)=>setMessage(e.target.value)}
          />

          <button onClick={sendMessage}>
            Send
          </button>

        </div>

      </div>

    </div>

  );
}

export default Chat;