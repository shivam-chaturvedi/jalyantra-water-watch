import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyBefKppOOhTLAwIfzbxXOAQ4iOgJLL_EGA',
  authDomain: 'water-sensor-a14d5.firebaseapp.com',
  databaseURL: 'https://water-sensor-a14d5-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'water-sensor-a14d5',
  storageBucket: 'water-sensor-a14d5.firebasestorage.app',
  messagingSenderId: '587321820490',
  appId: '1:587321820490:web:5d72a93805126239dc6db3',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const database = getDatabase(app);

export { firebaseConfig, database };
