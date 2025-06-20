// ChatListPage.js
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';

const ChatListPage = ({ userInfo }) => {
  const [chatRooms, setChatRooms] = useState([]);
  const [exitedRooms, setExitedRooms] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  // ✅ 내 채팅방 목록
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "chatRooms"),
      where("participants", "array-contains", currentUser.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const active = [];
      const exited = [];

      querySnapshot.forEach(docSnap => {
        const room = docSnap.data();
        const myLastRead = room.lastRead?.[currentUser.uid]?.toDate();
        const lastMessageTime = room.updatedAt?.toDate();
        const hasUnread = myLastRead && lastMessageTime && lastMessageTime > myLastRead;
        const roomObj = { id: docSnap.id, ...room, hasUnread };

        if (room.leftUsers?.[currentUser.uid]) {
          exited.push(roomObj);
        } else {
          active.push(roomObj);
        }
      });

      setChatRooms(active);
      setExitedRooms(exited);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // ✅ 초대 내역
  useEffect(() => {
    if (!currentUser) return;

    const inviteRef = collection(db, "chatRooms");
    const q = query(inviteRef);
    const unsubscribe = onSnapshot(q, async (roomsSnap) => {
      const results = [];
      for (const docSnap of roomsSnap.docs) {
        const roomId = docSnap.id;
        const inviteDoc = doc(db, "chatRooms", roomId, "invitations", currentUser.uid);
        const inviteSnap = await getDoc(inviteDoc);
        if (inviteSnap.exists()) {
          results.push({ roomId, ...inviteSnap.data() });
        }
      }
      setInvitations(results);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleRejoinRoom = async (roomId) => {
    const roomRef = doc(db, "chatRooms", roomId);
    try {
      const roomSnap = await getDoc(roomRef);
      if (!roomSnap.exists()) return alert("채팅방이 존재하지 않습니다.");

      const roomData = roomSnap.data();

      await updateDoc(roomRef, {
        participants: [...(roomData.participants || []), currentUser.uid],
        participantNames: [...(roomData.participantNames || []), userInfo.name],
        participantNicknames: [...(roomData.participantNicknames || []), userInfo.nickname],
        [`leftUsers.${currentUser.uid}`]: false,
        updatedAt: serverTimestamp()
      });

      await deleteDoc(doc(db, "chatRooms", roomId, "invitations", currentUser.uid));
      alert("채팅방에 참여했습니다.");
      navigate(`/chat/${roomId}`);
    } catch (err) {
      console.error("참여 오류:", err);
      alert("참여에 실패했습니다.");
    }
  };

  // handleCreateFreeRoom 함수 내부 수정
const handleCreateFreeRoom = async () => {
  if (!newRoomName.trim()) return alert("채팅방 이름을 입력해주세요.");
  // 인원 제한 체크
  if (maxParticipants && isNaN(Number(maxParticipants))) return alert("최대 인원은 숫자로 입력하세요!");

  try {
    const roomRef = await addDoc(collection(db, "chatRooms"), {
      roomName: newRoomName,
      maxParticipants: maxParticipants ? Number(maxParticipants) : null, // 인원 제한 필드 추가
      createdBy: currentUser.uid,
      participantNames: [userInfo.name],
      participantNicknames: [userInfo.nickname],
      participants: [currentUser.uid],
      leftUsers: {},
      lastRead: { [currentUser.uid]: new Date() },
      updatedAt: serverTimestamp()
    });
    setShowCreateRoomModal(false);
    setNewRoomName('');
    setMaxParticipants('');
    navigate(`/chat/${roomRef.id}`);
  } catch (err) {
    console.error("채팅방 생성 오류:", err);
    alert("채팅방 생성에 실패했습니다.");
  }
};

  if (loading) return <div className="loading-screen">채팅방 목록을 불러오는 중...</div>;

  return (
    <div className="chat-list-page">
      <h2>채팅</h2>
      <div className="chat-sections-container" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div className="card chat-section" style={{ flex: 1, minWidth: '280px', background: '#fff', borderRadius: '10px', padding: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
          <h3>내 채팅방 목록</h3>
          <ul style={{ padding: 0, listStyle: 'none' }}>
            {chatRooms.map(room => (
              <li
                key={room.id}
                onClick={() => navigate(`/chat/${room.id}`)}
                style={{
                  background: '#fff',
                  marginBottom: '8px',
                  padding: '12px',
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  cursor: 'pointer'
                }}
              >
                <strong>{room.roomName}</strong>
                <div style={{ fontSize: '12px', color: '#666' }}>{room.participants.length}명 참여중</div>
              </li>
            ))}
          </ul>

          {exitedRooms.length > 0 && (
            <div className="exited-room-section">
              <h4>📂 나간 채팅방</h4>
              <ul style={{ padding: 0, listStyle: 'none' }}>
                {exitedRooms.map(room => (
                  <li key={room.id}>
                    <span>{room.roomName || '채팅방'}</span>
                    <button onClick={() => handleRejoinRoom(room.id)}>다시 참여하기</button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {invitations.length > 0 && (
            <div className="invitation-section">
              <h4>📨 받은 초대</h4>
              <ul style={{ padding: 0, listStyle: 'none' }}>
                {invitations.map(invite => (
                  <li key={invite.roomId}>
                    <span>{invite.nickname}님이 초대한 채팅방</span>
                    <button onClick={() => handleRejoinRoom(invite.roomId)}>참여 수락</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="card chat-section" style={{ flex: 1, minWidth: '280px', background: '#fff', borderRadius: '10px', padding: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
          <h3>이용 안내</h3>
          <p>모임에 참여하면 채팅방이 자동 생성됩니다.</p>
          <button onClick={() => navigate('/meetings')} style={{ width: '100%', marginTop: '10px' }}>모임 둘러보기</button>
          <button onClick={() => setShowCreateRoomModal(true)} style={{ width: '100%', marginTop: '10px' }}>+ 자유 채팅방 만들기</button>
        </div>
      </div>

      {showCreateRoomModal && (
  <div className="modal-overlay">
    <div className="modal-content">
      <h3>자유 채팅방 만들기</h3>

      {/* 채팅방 이름 입력 */}
      <input
        type="text"
        placeholder="채팅방 이름 입력"
        value={newRoomName}
        onChange={(e) => setNewRoomName(e.target.value)}
      />

      <input
  type="number"
  placeholder="최대 인원 수 (예: 10, 비워두면 무제한)"
  value={maxParticipants}
  onChange={(e) => setMaxParticipants(e.target.value)}
  style={{ marginTop: '8px', width: '100%' }}
/>

      {/* 버튼 */}
      <div style={{ marginTop: '10px' }}>
        <button onClick={handleCreateFreeRoom}>생성</button>
        <button onClick={() => setShowCreateRoomModal(false)} style={{ marginLeft: '8px' }}>취소</button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default ChatListPage;