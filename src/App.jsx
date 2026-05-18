import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Signup from "../src/signup.jsx";
import Chat from "../src/chat.jsx";
import Login from "../src/login.jsx";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Signup />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;                                                                                   