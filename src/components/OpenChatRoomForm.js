import { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const OpenChatRoomForm = ({ onRoomCreated }) => {
  const [roomName, setRoomName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState(null);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!roomName.trim()) {
      alert('채팅방 이름을 입력하세요.');
      return;
    }
    setCreating(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("로그인이 필요합니다.");
        setCreating(false);
        return;
      }
      const docRef = await addDoc(collection(db, "openChatRooms"), {
        roomName: roomName.trim(),
        createdBy: user.uid,
        createdByName: user.displayName || user.email,
        createdAt: serverTimestamp(),
        participants: [user.uid],
        participantNames: [user.displayName || user.email],
      });
      setCreatedRoomId(docRef.id);
      setRoomName('');
      if (onRoomCreated) onRoomCreated();
    } catch (err) {
      alert('채팅방 생성에 실패했습니다.');
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleCopyInviteLink = () => {
    if (!createdRoomId) return;
    const url = window.location.origin + `/openchat/${createdRoomId}`;
    navigator.clipboard.writeText(url);
    alert('초대 링크가 복사되었습니다!\n친구에게 공유해보세요.');
  };

  return (
    <div className="openchat-form-card" style={{ border: '1px solid #eee', borderRadius: 8, padding: 16, marginBottom: 24 }}>
      <h3>오픈채팅방 만들기</h3>
      <form onSubmit={handleCreateRoom}>
        <input
          type="text"
          placeholder="채팅방 이름을 입력하세요"
          value={roomName}
          onChange={e => setRoomName(e.target.value)}
          style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', marginBottom: 12 }}
        />
        <button
          type="submit"
          disabled={creating}
          style={{
            background: '#0d6efd',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '8px 20px',
            fontWeight: 600,
            cursor: creating ? 'not-allowed' : 'pointer'
          }}
        >
          {creating ? '생성 중...' : '오픈채팅방 만들기'}
        </button>
      </form>
      {createdRoomId && (
        <div style={{ marginTop: 16 }}>
          <b>초대 링크:</b>
          <div style={{ background: '#f8f9fa', padding: '8px 12px', borderRadius: 4, margin: '8px 0' }}>
            <span style={{ fontSize: 13 }}>{window.location.origin + `/openchat/${createdRoomId}`}</span>
            <button
              onClick={handleCopyInviteLink}
              style={{
                marginLeft: 8,
                background: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '4px 10px',
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              초대 링크 복사
            </button>
          </div>
          <div style={{ fontSize: 13, color: '#555' }}>
            이 링크를 친구에게 공유하면 누구나 바로 입장할 수 있습니다.
          </div>
        </div>
      )}
    </div>
  );
};

export default OpenChatRoomForm;