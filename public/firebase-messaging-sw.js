importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
firebase.initializeApp({
    apiKey: "AIzaSyDyHaQZaGCJtwhjgoYxPEUxXpyrbPxUT0Q",
    authDomain: "bristletech-crm-4a99d.firebaseapp.com",
    databaseURL: "https://bristletech-crm-4a99d-default-rtdb.firebaseio.com",
    projectId: "bristletech-crm-4a99d",
    storageBucket: "bristletech-crm-4a99d.firebasestorage.app",
    messagingSenderId: "163504830934",
    appId: "1:163504830934:web:5e486debefe3b775c08c77",
    measurementId: "G-7PYN8ZEWPW"
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    // Customize notification here
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/logo.png' // Adjust path to actual logo
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
