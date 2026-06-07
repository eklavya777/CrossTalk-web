import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../src/firebase.js";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "firebase/auth";

import axios from "axios";

import signupBgMobile from "./assets/signupMobile.png";
import signupBg from "./assets/signup.png";

import "./signup.css";



// ================= ICONS =================

function IconPhone() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
        fill="#1a1a1a"
      />
    </svg>
  );
}

function IconPlane() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"
        fill="#fff"
      />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"
        fill="#1a1a1a"
      />
    </svg>
  );
}

function IconShieldCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke="#fff"
        strokeWidth="2"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke="#fff"
        strokeWidth="2"
      />
    </svg>
  );
}



// ================= COMPONENT =================

function Signup() {

  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [localPhone, setLocalPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const recaptchaVerifier = useRef(null);



  // ================= PHONE =================

  const phoneE164 = () => {

    const digits = localPhone.replace(/\D/g, "");

    return digits
      ? `${countryCode}${digits}`
      : "";

  };



  // ================= SEND OTP =================

  const sendOTP = async () => {

    try {

      setLoading(true);

      const phone = phoneE164();

      if (!name.trim()) {

        alert("Please enter your name");
        setLoading(false);
        return;

      }

      if (!phone) {

        alert("Please enter valid phone number");
        setLoading(false);
        return;

      }

      if (!recaptchaVerifier.current) {

        recaptchaVerifier.current = new RecaptchaVerifier(
          auth,
          "recaptcha-container",
          {
            size: "invisible"
          }
        );

      }

      const result = await signInWithPhoneNumber(
        auth,
        phone,
        recaptchaVerifier.current
      );

      setConfirmationResult(result);

      alert("OTP sent successfully");

    } catch (error) {

      console.log("SEND OTP ERROR:", error);

      alert(
        error?.message ||
        "Failed to send OTP"
      );

    } finally {

      setLoading(false);

    }

  };



  // ================= VERIFY OTP =================
// ================= VERIFY OTP =================

const verifyOTP = async () => {

  try {

    setLoading(true);

    if (!confirmationResult) {

      alert("Please send OTP first");
      return;

    }

    if (!otp.trim()) {

      alert("Please enter OTP");
      return;

    }

    const result = await confirmationResult.confirm(otp);

    const firebaseUID = result.user.uid;

    console.log("Firebase UID:", firebaseUID);

    const response = await axios.post(
      `${import.meta.env.VITE_BACKEND_URL}/api/users/register`,
      {
        name: name,
        phone: phoneE164(),
        firebase_uid: firebaseUID,
        preferred_language: "en"
      }
    );

    // IMPORTANT
    localStorage.setItem(
      "user",
      JSON.stringify(response.data.user)
    );

    alert("Signup successful");

    navigate("/chat");

  } catch (error) {

    console.log("VERIFY OTP ERROR:", error);

    // USER EXISTS
    if (error.response?.status === 409) {

      alert("User already exists. Please login.");

      navigate("/login");

      return;

    }

    // INVALID OTP
    if (
      error.code === "auth/invalid-verification-code"
    ) {

      alert("Invalid OTP");

      return;

    }

    alert(
      error.response?.data?.error ||
      "Signup failed"
    );

  } finally {

    setLoading(false);

  }

};



  // ================= UI =================

  return (

    <div
      className="signup-page"
      style={{
        "--signup-bg": `url(${signupBg})`,
        "--signup-bg-mobile": `url(${signupBgMobile})`
      }}
    >

      <div className="signup-chip">

        {/* TOP */}

        <div className="signup-chip__top">

          <div className="signup-chip__flourish" />

          <h2 className="signup-chip__title">
            Welcome!
          </h2>

          <p className="signup-chip__subtitle">
            Sign up to continue your conversations
          </p>

        </div>



        {/* FORM */}

        <div className="signup-chip__main">

          {/* NAME */}

          <div className="signup-field">

            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

          </div>



          {/* PHONE */}

          <div className="signup-phone-row">

            <IconPhone />

            <select
              className="signup-phone-row__code"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
            >

              <option value="+91">🇮🇳 +91</option>
              <option value="+81">🇯🇵 +81</option>
              <option value="+1">🇺🇸 +1</option>
              <option value="+44">🇬🇧 +44</option>
              <option value="+33">🇫🇷 +33</option>
              <option value="+49">🇩🇪 +49</option>
              <option value="+86">🇨🇳 +86</option>
              <option value="+82">🇰🇷 +82</option>

            </select>

            <input
              type="tel"
              placeholder="9876543210"
              value={localPhone}
              onChange={(e) => setLocalPhone(e.target.value)}
            />

          </div>



          {/* SEND OTP */}

          <button
            className="signup-btn signup-btn--primary"
            onClick={sendOTP}
            disabled={loading}
          >

            <IconPlane />

            {loading ? "Sending..." : "Send OTP"}

          </button>



          <div className="signup-or">
            OR
          </div>



          {/* OTP */}

          <div className="signup-field">

            <IconLock />

            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />

          </div>



          {/* VERIFY */}

          <button
            className="signup-btn signup-btn--accent"
            onClick={verifyOTP}
            disabled={loading}
          >

            <IconShieldCheck />

            {loading ? "Verifying..." : "Verify OTP"}

          </button>

          <p className="signup-legal">
            By continuing, you agree to CrossTalk's
            <br />
            <Link to="/privacy-policy">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link to="/terms-and-conditions">
              Terms and Conditions
            </Link>
            .
          </p>

        </div>



        {/* LOGIN */}

        <p className="signup-link">

          Already have an account?{" "}

          <button onClick={() => navigate("/login")}>
            Login
          </button>

        </p>



        {/* RECAPTCHA */}

        <div
          id="recaptcha-container"
          style={{
            position: "absolute",
            zIndex: -1,
            pointerEvents: "none"
          }}
        />

      </div>

    </div>

  );

}

export default Signup;