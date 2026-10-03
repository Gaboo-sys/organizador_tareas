importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC-ZBr1jG9mRA0tGDc_n00X8vtQbvHsKuI",
  authDomain: "organizador-tareas-compartidas.firebaseapp.com",
  projectId: "organizador-tareas-compartidas",
  storageBucket: "organizador-tareas-compartidas.firebasestorage.app",
  messagingSenderId: "840628870631",
  appId: "1:840628870631:web:87cb6bad470490520fb142"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || "Nueva tarea agregada 📝";
  const notificationOptions = {
    body: payload.notification?.body || "Se ha creado una nueva tarea en tu organizador.",
    icon: "https://cdn-icons-png.flaticon.com/512/906/906334.png"
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
