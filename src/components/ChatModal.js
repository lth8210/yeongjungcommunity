// src/components/ChatModal.js
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

const ChatModal = ({ open, onClose, fromUser, toUser }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    // 1:1 채팅방 id 규칙(예: uid1_uid2 오름차순)
    const ids = [fromUser.uid, toUser.uid].sort();
    const roomId = ids.join('_');
    const q = query(collection(db, "directChats", roomId, "messages"), orderBy("createdAt"));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(doc => doc.data()));
    });
    return () => unsub();
  }, [open, fromUser, toUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const ids = [fromUser.uid, toUser.uid].sort();
    const roomId = ids.join('_');
    await addDoc(collection(db, "directChats", roomId, "messages"), {
      from: fromUser.uid,
      to: toUser.uid,
      content: input,
      createdAt: serverTimestamp(),
    });
    setInput('');
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content" role="dialog" aria-modal="true" aria-label="1:1 채팅">
        <h3>1:1 채팅</h3>
        <div>상대: <b>{toUser.nickname}{toUser.name && ` (${toUser.name})`}</b></div>
        <div style={{height:"200px", overflowY:"auto", background:"#f7f7f7", margin:"10px 0", padding:"8px", borderRadius:"8px"}}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              textAlign: msg.from === fromUser.uid ? "right" : "left",
              margin:"6px 0"
            }}>
              <span style={{
                display:"inline-block",
                background: msg.from === fromUser.uid ? "#0d6efd" : "#aaa",
                color:"#fff",
                borderRadius:"12px",
                padding:"6px 12px",
                maxWidth:"70%",
                wordBreak:"break-all"
              }}>
                {msg.content}
              </span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div style={{display:"flex", gap:"8px"}}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="메시지 입력"
            aria-label="메시지 입력"
            style={{flex:1, padding:"8px", borderRadius:"6px", border:"1px solid #ccc"}}
            onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          />
          <button
            onClick={handleSend}
            style={{background:"#20c997", color:"#fff", border:"none", borderRadius:"6px", padding:"6px 16px", fontWeight:600}}
            aria-label="메시지 전송"
            title="메시지 전송"
          >전송</button>
          <button
            onClick={onClose}
            style={{background:"#aaa", color:"#fff", border:"none", borderRadius:"6px", padding:"6px 16px"}}
            aria-label="닫기"
            title="닫기"
          >닫기</button>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;