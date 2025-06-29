importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAHcSFAMCe3nP5tPSqql9WsyzHNiSKCwl0",
  authDomain: "yeongjungcommunity.firebaseapp.com",
  projectId: "yeongjungcommunity",
  storageBucket: "yeongjungcommunity.firebasestorage.app",
  messagingSenderId: "692309100941",
  appId: "1:692309100941:web:6764567e85f215c72ad5c4"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  // 브라우저가 백그라운드일 때 알림 표시
  self.registration.showNotification(
    payload.notification.title,
    {
      body: payload.notification.body,
      icon: '/logo192.png' // public 폴더의 앱 로고 등 (원하는 이미지 경로로 변경 가능)
    }
  );
});