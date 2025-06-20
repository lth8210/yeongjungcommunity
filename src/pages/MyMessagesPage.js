// src/pages/MyMessagesPage.js
import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

const MyMessagesPage = () => {
  const [messages, setMessages] = useState([]);
  const [fontSize, setFontSize] = useState('normal'); // 폰트 크기 설정

  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchMessages = async () => {
      if (!currentUser?.uid) return;
      try {
        const q = query(
          collection(db, "messages"),
          where("to", "==", currentUser.uid),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const msgs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMessages(msgs);
      } catch (err) {
        console.error("쪽지 불러오기 오류:", err);
      }
    };

    fetchMessages();
  }, [currentUser]);

  const fontSizeStyle = fontSize === 'large' ? '1.2rem' : '1rem';

  return (
    <div className="mypage-container">
      <h2 style={{ fontSize: '1.5rem' }}>📩 받은 쪽지함</h2>

      {/* 접근성 개선: 글자 크기 조절 버튼 */}
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={() => setFontSize('normal')}
          aria-label="기본 글자 크기"
          title="기본 글자 크기"
          style={{ marginRight: '8px' }}
        >
          🔤 기본 보기
        </button>
        <button
          onClick={() => setFontSize('large')}
          aria-label="글자를 크게 보기"
          title="글자를 크게 보기"
        >
          🔍 글자 크게
        </button>
      </div>

      {messages.length === 0 ? (
        <p style={{ fontSize: fontSizeStyle }}>받은 쪽지가 없습니다.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {messages.map(msg => (
            <li
              key={msg.id}
              style={{
                marginBottom: '24px',
                borderBottom: '1px solid #aaa',
                paddingBottom: '12px',
                fontSize: fontSizeStyle,
                lineHeight: '1.6'
              }}
            >
              <p><strong>보낸 사람:</strong> {msg.userName || msg.uid}</p>
              <p><strong>내용:</strong> {msg.text}</p>
              <p><strong>받은 시간:</strong> {msg.createdAt?.toDate().toLocaleString('ko-KR') || '시간 정보 없음'}</p>

              {/* 👵 이해 돕는 자연어 설명 추가 */}
              <p style={{ color: '#555', fontSize: '0.9rem' }}>
                이 쪽지는 <strong>{msg.userName || '알 수 없음'}</strong>님이 보낸 {msg.text.length}자 분량의 메시지입니다.
              </p>

              {/* 향후 기능 확장용 버튼 예시 */}
              <div style={{ marginTop: '8px' }}>
                <button
                  aria-label="쪽지에 답장하기"
                  title="답장하기"
                  style={{ backgroundColor: '#f0f0f0', padding: '6px 12px', border: '1px solid #ccc' }}
                >
                  💬 답장하기
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MyMessagesPage;