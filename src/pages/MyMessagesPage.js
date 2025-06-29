import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import MessageModal from '../components/MessageModal';

const MyMessagesPage = () => {
  const [messages, setMessages] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [fontSize, setFontSize] = useState('normal');
  const [searchTerm, setSearchTerm] = useState(''); // 검색 필터
  const [collapsedSections, setCollapsedSections] = useState({}); // 접기/펼치기 상태
  const currentUser = auth.currentUser;

  // 사용자 닉네임 매핑
  useEffect(() => {
    const fetchUsersMap = async () => {
      const usersSnap = await getDocs(collection(db, "users"));
      const map = {};
      usersSnap.docs.forEach(doc => {
        const data = doc.data();
        map[doc.id] = data.nickname || data.name || "알 수 없는 사용자";
      });
      setUsersMap(map);
    };
    fetchUsersMap();
  }, []);

  // 받은 메시지 불러오기 (실시간 업데이트)
  useEffect(() => {
    if (!currentUser?.uid) return;
    const q = query(
      collection(db, "messages"),
      where("to", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fromUser: doc.data().fromUser || doc.data().uid // uid 호환성 유지
      }));
      setMessages(msgs);
    }, (err) => {
      console.error("쪽지 불러오기 오류:", err);
    });
    return () => unsub();
  }, [currentUser]);

  // 보낸 사람별로 그룹화
  const groupedMessages = messages.reduce((acc, msg) => {
    const senderUid = msg.fromUser;
    if (!acc[senderUid]) acc[senderUid] = [];
    acc[senderUid].push(msg);
    return acc;
  }, {});

  // 검색 필터 적용
  const filteredGroupedMessages = Object.keys(groupedMessages).reduce((acc, senderUid) => {
    const filtered = groupedMessages[senderUid].filter(msg =>
      (usersMap[senderUid] || senderUid).toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.text.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filtered.length > 0) acc[senderUid] = filtered;
    return acc;
  }, {});

  // 답장 전송
  const handleReply = async (toUserUid, content) => {
    if (!currentUser?.uid || !toUserUid) {
      alert("로그인 후 사용해 주세요.");
      return;
    }
    try {
      await addDoc(collection(db, "messages"), {
        text: content,
        createdAt: serverTimestamp(),
        fromUser: currentUser.uid,
        to: toUserUid,
        userName: currentUser.nickname || currentUser.email || currentUser.name || "",
      });
      setShowMessageModal(false);
      alert("답장이 전송되었습니다!");
    } catch (err) {
      console.error("답장 오류:", err);
      alert("답장 전송 중 오류가 발생했습니다.");
    }
  };

  const fontSizeStyle = fontSize === 'large' ? '1.2rem' : '1rem';

  const toggleSection = (senderUid) => {
    setCollapsedSections(prev => ({
      ...prev,
      [senderUid]: !prev[senderUid]
    }));
  };

  return (
    <div className="mypage-container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.5rem' }}>📩 받은 쪽지함</h2>

      {/* 검색 필터 */}
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="보낸 사람이나 내용 검색..."
        style={{ width: '100%', padding: '8px', marginBottom: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
        aria-label="보낸 사람이나 내용 검색"
      />

      {/* 접근성 개선: 글자 크기 조절 버튼 */}
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={() => setFontSize('normal')}
          aria-label="기본 글자 크기"
          title="기본 글자 크기"
          style={{ marginRight: '8px', padding: '6px 12px', background: '#f0f0f0', border: '1px solid #ccc' }}
        >
          🔤 기본 보기
        </button>
        <button
          onClick={() => setFontSize('large')}
          aria-label="글자를 크게 보기"
          title="글자를 크게 보기"
          style={{ padding: '6px 12px', background: '#f0f0f0', border: '1px solid #ccc' }}
        >
          🔍 글자 크게
        </button>
      </div>

      {Object.keys(filteredGroupedMessages).length === 0 ? (
        <p style={{ fontSize: fontSizeStyle }}>검색 결과가 없습니다.</p>
      ) : (
        Object.keys(filteredGroupedMessages).map(senderUid => (
          <div key={senderUid} style={{ marginBottom: '24px', border: '1px solid #eee', borderRadius: '8px', padding: '12px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '12px', cursor: 'pointer' }} onClick={() => toggleSection(senderUid)}>
              {usersMap[senderUid] || "알 수 없는 사용자"}에게 받은 메시지
              <span style={{ marginLeft: '8px' }}>{collapsedSections[senderUid] ? '▼' : '▲'}</span>
            </h3>
            {!collapsedSections[senderUid] && filteredGroupedMessages[senderUid].map(msg => (
              <div
                key={msg.id}
                style={{
                  marginBottom: '12px',
                  padding: '10px',
                  borderBottom: '1px solid #ddd',
                  fontSize: fontSizeStyle,
                  lineHeight: '1.6',
                }}
              >
                <p><strong>내용:</strong> {msg.text}</p>
                <p><strong>받은 시간:</strong> {msg.createdAt?.toDate().toLocaleString('ko-KR') || '시간 정보 없음'}</p>
                <p style={{ color: '#555', fontSize: '0.9rem' }}>
                  이 쪽지는 <strong>{usersMap[senderUid] || '알 수 없음'}</strong>님이 보낸 {msg.text.length}자 분량의 메시지입니다.
                </p>
                <button
                  onClick={() => {
                    setSelectedUser({ uid: senderUid, nickname: usersMap[senderUid] || "알 수 없는 사용자" });
                    setShowMessageModal(true);
                  }}
                  style={{ marginTop: '8px', backgroundColor: '#0d6efd', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px' }}
                  aria-label={`"${usersMap[senderUid] || '알 수 없음'}"에게 답장하기`}
                  title="답장하기"
                >
                  💬 답장하기
                </button>
              </div>
            ))}
          </div>
        ))
      )}
      {showMessageModal && selectedUser && (
        <MessageModal
          open={showMessageModal}
          onClose={() => setShowMessageModal(false)}
          fromUser={currentUser}
          toUser={selectedUser}
          onSend={handleReply}
        />
      )}
      <button
        onClick={() => window.location.href = '/mypage'}
        style={{ marginTop: '20px', padding: '8px 16px', background: '#aaa', color: '#fff', border: 'none', borderRadius: '6px' }}
      >
        마이페이지로 돌아가기
      </button>
    </div>
  );
};

export default MyMessagesPage;