import { BrowserRouter, Routes, Route } from "react-router-dom";
import Signup from "../src/signup.jsx";
import Chat from "../src/chat.jsx";
import Login from "../src/login.jsx";
import LegalPage from "../src/LegalPage.jsx";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Signup />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/privacy-policy" element={<LegalPage type="privacy" />} />
        <Route path="/terms-and-conditions" element={<LegalPage type="terms" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
