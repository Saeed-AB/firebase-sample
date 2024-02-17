import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: import.meta.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: import.meta.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

export const initializeFirebaseApp = (
  getFirebaseToken: (detail: {
    token: string | null;
    errorMessage?: string;
  }) => void
) => {
  const app = initializeApp(firebaseConfig);
  const messaging = getMessaging(app);

  getToken(messaging, {
    vapidKey: import.meta.env.REACT_APP_FIREBASE_VAPID_KEY,
  })
    .then((token) => {
      if (token) {
        console.log("Token", token);
      }

      getFirebaseToken({
        token: token ?? null,
        errorMessage: !token
          ? "No registration token available. Request permission to generate one."
          : undefined,
      });
    })
    .catch((err) => {
      getFirebaseToken({
        token: null,
        errorMessage: "An error occurred while retrieving token.",
      });

      console.log("An error occurred while retrieving token. ", err);
      // ...
    });
};
