// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyATNm04vXuyb-DFEtO1HgKypV0_J_GXt84",
  authDomain: "radar-4ccad.firebaseapp.com",
  projectId: "radar-4ccad",
  storageBucket: "radar-4ccad.firebasestorage.app",
  messagingSenderId: "32742252441",
  appId: "1:32742252441:web:6a24809834f0e35dac7d08",
  measurementId: "G-MJB9HK44S4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);