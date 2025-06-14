// firebase.js 파일의 전체 내용

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// 여기에 아까 복사한 firebaseConfig 코드를 붙여넣으세요.
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
const auth = getAuth(app); // 2. auth 객체를 생성합니다.

// Firestore 데이터베이스 객체 내보내기
// 다른 파일에서 이 db 객체를 가져다 쓸 겁니다.
export { db, auth };