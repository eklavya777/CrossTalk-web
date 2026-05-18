// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCPG3lR7scIbUbkx-7mbwLFg96C_YwsWCc",
  authDomain: "crosstalk-d1925.firebaseapp.com",
  projectId: "crosstalk-d1925",
  storageBucket: "crosstalk-d1925.firebasestorage.app",
  messagingSenderId: "369662076044",
  appId: "1:369662076044:web:9cf4e2f98ce539a75d07a9",
  measurementId: "G-B5B3J6PRTG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);