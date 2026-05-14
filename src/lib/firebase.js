const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBefKppOOhTLAwIfzbxXOAQ4iOgJLL_EGA',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'water-sensor-a14d5.firebaseapp.com',
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    import.meta.env.VITE_FIREBASE_RTDB_URL ||
    'https://water-sensor-a14d5-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'water-sensor-a14d5',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'water-sensor-a14d5.firebasestorage.app',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '587321820490',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID || '1:587321820490:web:5d72a93805126239dc6db3',
};

export default firebaseConfig;
