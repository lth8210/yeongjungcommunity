// src/pages/OpenChatPage.js

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { db, auth } from '../firebase';
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';

const OpenChatPage = () => {
  const { roomId } = useParams();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);

  // 1. 채팅방 정보 불러오기
  useEffect(() => {
    const fetchRoom = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "openChatRooms", roomId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setRoom({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (err) {
        alert("채팅방 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [roomId]);

  // 2. 채팅방 입장 시 참가자 자동 추가
  useEffect(() => {
    const user = auth.currentUser;
    if (user && room) {
      if (!room.participants?.includes(user.uid)) {
        updateDoc(doc(db, "openChatRooms", roomId), {
          participants: arrayUnion(user.uid),
          participantNames: arrayUnion(user.displayName || user.email)
        });
      }
    }
  }, [room, roomId]);

  // 3. 메시지 실시간 구독
  useEffect(() => {
    if (!roomId) return;
    const q = query(
      collection(db, "openChatRooms", roomId, "messages"),
      orderBy("createdAt")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [roomId]);

  // 4. 메시지 입력창 포커스/스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 5. 메시지 전송
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }
    if (!message.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, "openChatRooms", roomId, "messages"), {
        text: message,
        uid: user.uid,
        userName: user.displayName || user.email,
        createdAt: serverTimestamp()
      });
      setMessage('');
    } catch (err) {
      alert('메시지 전송 실패');
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div>채팅방 정보를 불러오는 중...</div>;
  if (!room) return <div>채팅방을 찾을 수 없습니다.</div>;

  return (
    <div className="openchat-page" style={{
      maxWidth: 500, margin: '30px auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 0
    }}>
      <div style={{ borderBottom: '1px solid #eee', padding: '16px 20px', fontWeight: 700, fontSize: 20 }}>
        {room.roomName}
      </div>
      <div style={{
        minHeight: 320,
        maxHeight: 400,
        overflowY: 'auto',
        padding: '16px 12px',
        background: '#f7f9fa',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {messages.length === 0 ? (
          <div style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>아직 메시지가 없습니다.</div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              style={{
                marginBottom: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.uid === auth.currentUser?.uid ? 'flex-end' : 'flex-start'
              }}
            >
              <div style={{
                background: msg.uid === auth.currentUser?.uid ? '#1976d2' : '#e3eaf2',
                color: msg.uid === auth.currentUser?.uid ? '#fff' : '#222',
                borderRadius: 12,
                padding: '8px 14px',
                maxWidth: 320,
                wordBreak: 'break-all',
                fontSize: 15
              }}>
                {msg.text}
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                {msg.userName} {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleString() : ''}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} style={{ display: 'flex', borderTop: '1px solid #eee', padding: 12, background: '#fafbfc' }}>
        <input
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="메시지를 입력하세요"
          style={{
            flex: 1,
            border: '1px solid #ccc',
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: 15
          }}
          disabled={sending}
        />
        <button
          type="submit"
          style={{
            marginLeft: 8,
            background: '#0d6efd',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '8px 18px',
            fontWeight: 600,
            cursor: sending ? 'not-allowed' : 'pointer'
          }}
          disabled={sending || !message.trim()}
        >
          전송
        </button>
      </form>
    </div>
  );
};

export default OpenChatPage;