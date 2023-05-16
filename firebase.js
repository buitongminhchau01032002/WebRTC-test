// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: 'AIzaSyDzMRx_4CmV_p3Feut2wOrEbirNe6I7XfA',
    authDomain: 'web-rtc-demo-782f0.firebaseapp.com',
    projectId: 'web-rtc-demo-782f0',
    storageBucket: 'web-rtc-demo-782f0.appspot.com',
    messagingSenderId: '1055219933537',
    appId: '1:1055219933537:web:8fec98e26ffdaf8c45e520',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
