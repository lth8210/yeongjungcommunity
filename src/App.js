// src/App.js

import './App.css';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import { useEffect, useState } from "react";
import { onMessage } from "firebase/messaging";
import { messaging } from "./firebase";
import NotificationButton from "./components/NotificationButton";

function App() {
  // "최초 로그인 시"에만 알림 버튼이 보이게 하기 위한 상태
  const [showNotificationButton, setShowNotificationButton] = useState(() => {
    return !localStorage.getItem("notificationRequested");
  });

  useEffect(() => {
    if (!messaging) return;
    const unsubscribe = onMessage(messaging, (payload) => {
      alert(`${payload.notification.title}\n${payload.notification.body}`);
    });
    return unsubscribe;
  }, []);

  // 알림 버튼에서 허용/거부 후 호출될 콜백
  const handleNotificationRequested = () => {
    localStorage.setItem("notificationRequested", "true");
    setShowNotificationButton(false);
  };

  return (
    <Router>
      {/* 최초 로그인 시에만 알림 버튼 노출, 허용/거부 후 사라짐 */}
      {showNotificationButton && (
        <NotificationButton onRequested={handleNotificationRequested} />
      )}
      {/* 실제 라우팅되는 페이지들 */}
      <AppRoutes />
    </Router>
  );
}

export default App;