import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getMessaging, getToken, isSupported } from "firebase/messaging";

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyAHcSFAMCe3nP5tPSqql9WsyzHNiSKCwl0",
  authDomain: "yeongjungcommunity.firebaseapp.com",
  projectId: "yeongjungcommunity",
  storageBucket: "yeongjungcommunity.firebasestorage.app",
  messagingSenderId: "692309100941",
  appId: "1:692309100941:web:6764567e85f215c72ad5c4"
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// FCM 지원여부 체크 (서비스워커 미지원 브라우저 예외처리)
let messaging = null;
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  }
});

export async function requestFcmToken() {
  // messaging이 null이면 FCM 미지원 브라우저
  if (!messaging) {
    console.warn("이 브라우저에서는 FCM이 지원되지 않습니다.");
    return null;
  }
  try {
    const token = await getToken(messaging, {
      vapidKey: "BOVR3h-i1hGX-lAsPZecVWUEy_UJHTU9GveyhIIdBQxDGG5oDHukAWLKGV9j8ulEAD14VzCM7qvUbE7BErc-UeU"
    });
    return token;
  } catch (err) {
    // 권한 거부/차단 시 사용자 안내
    if (err.code === "messaging/permission-blocked") {
      alert("브라우저 알림 권한이 차단되어 FCM 알림을 받을 수 없습니다.\n브라우저 설정에서 알림을 허용해주세요.");
    } else if (err.code === "messaging/permission-denied") {
      alert("알림 권한이 거부되었습니다.");
    } else {
      console.error("FCM 토큰 발급 실패:", err);
    }
    return null;
  }
}

export { db, auth, provider, messaging };