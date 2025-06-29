import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const MessageModal = ({ open, onClose, fromUser, toUser, onSend }) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!open) return null;

  const handleSend = () => {
    if (!message.trim() || !onSend) return;
    setSending(true);
    onSend(toUser.uid, message)
      .then(() => {
        setSending(false);
        setSent(true);
        setMessage('');
        setTimeout(() => {
          setSent(false);
          onClose();
        }, 1200);
      })
      .catch((err) => {
        setSending(false);
        alert("쪽지 전송 중 오류가 발생했습니다.");
        console.error("쪽지 오류:", err);
      });
  };

  return (
    <div className="modal-backdrop" tabIndex={0} role="dialog" aria-modal="true" aria-label="쪽지 보내기">
      <div className="modal-content">
        <h3>쪽지 보내기</h3>
        <div>받는 사람: <b>{toUser.nickname || toUser.name || toUser.uid}</b></div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="쪽지 내용을 입력하세요"
          aria-label="쪽지 내용 입력"
          rows={4}
          style={{ width: "100%", marginTop: "12px" }}
          disabled={sending}
        />
        <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
          <button
            onClick={handleSend}
            disabled={sending}
            style={{ background: "#0d6efd", color: "#fff", border: "none", borderRadius: "6px", padding: "6px 16px", fontWeight: 600 }}
            aria-label="쪽지 전송"
            title="쪽지 전송"
          >
            {sending ? "전송 중..." : "전송"}
          </button>
          <button
            onClick={onClose}
            style={{ background: "#aaa", color: "#fff", border: "none", borderRadius: "6px", padding: "6px 16px" }}
            aria-label="닫기"
            title="닫기"
            disabled={sending}
          >
            닫기
          </button>
        </div>
        {sent && <div role="alert" aria-live="assertive" style={{ color: "#198754", marginTop: "10px" }}>쪽지가 전송되었습니다!</div>}
      </div>
    </div>
  );
};

export default MessageModal;