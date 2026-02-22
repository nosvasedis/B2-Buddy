
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDYap6A4g_mq8mS__w-VI1k-L4P4vuyTDU",
  authDomain: "b2-buddy.firebaseapp.com",
  databaseURL: "https://b2-buddy-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "b2-buddy",
  storageBucket: "b2-buddy.firebasestorage.app",
  messagingSenderId: "868224727536",
  appId: "1:868224727536:web:5622fa89716191210c4535",
  measurementId: "G-TJ64RSGSRP"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
