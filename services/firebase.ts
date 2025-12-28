
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';
import 'firebase/compat/functions';

// ------------------------------------------------------------------
// SURI-ARAL V2 CONFIGURATION
// ------------------------------------------------------------------

export const firebaseConfig = {
  apiKey: "AIzaSyBTnX0t4L3UWr2A0ipDwsXDQzYj2MG-6KA",
  authDomain: "suri-aral-v2.firebaseapp.com",
  databaseURL: "https://suri-aral-v2-default-rtdb.firebaseio.com",
  projectId: "suri-aral-v2",
  storageBucket: "suri-aral-v2.firebasestorage.app",
  messagingSenderId: "575053421890",
  appId: "1:575053421890:web:c0e0bbc1b6cbe31846bcdb"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Get a reference to the auth service
export const auth = firebase.auth();

// Get a reference to the Realtime Database service
// Get a reference to the Realtime Database service
export const db = firebase.database();

// Get a reference to the Cloud Functions service
export const functions = firebase.functions();

export default firebase;
