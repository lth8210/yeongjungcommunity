import React, { useEffect, useState } from "react";
import { requestFcmToken } from "../firebase";

function NotificationButton({ onRequested }) {
  const [isGranted, setIsGranted] = useState(false);

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setIsGranted(Notification.permission === "granted");
    }
  }, []);

  const handleClick = async () => {
    const token = await requestFcmToken();
    if (token) {
      alert("알림이 활성화되었습니다!");
      setIsGranted(true);
      if (onRequested) onRequested();
    } else {
      alert("알림 권한이 필요합니다. 브라우저 설정에서 알림을 허용해주세요.");
      if (onRequested) onRequested();
    }
  };

  if (isGranted) return null;

  return (
    <div style={{
      width: "100%",
      display: "flex",
      justifyContent: "center",
      background: "#f8f9fa"
    }}>
      <button
        onClick={handleClick}
        style={{
          margin: 12,
          padding: "8px 20px",
          borderRadius: 6,
          border: "1px solid #1976d2",
          background: "#fff",
          color: "#1976d2",
          fontWeight: 700,
          fontSize: 16,
          cursor: "pointer"
        }}
      >
        🔔 알림 허용하기
      </button>
    </div>
  );
}

export default NotificationButton;