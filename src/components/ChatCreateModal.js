import { useState } from 'react';
import Modal from 'react-modal';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { QRCodeSVG } from 'qrcode.react';
import './ChatCreateModal.css';

Modal.setAppElement('#root');

const ChatCreateModal = ({ isOpen, onRequestClose, userInfo }) => {
  const [roomName, setRoomName] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [inviteLink, setInviteLink] = useState('');

  const handleCreate = async () => {
    const currentUser = auth.currentUser;
    if (!roomName.trim()) {
      alert("채팅방 이름을 입력해주세요.");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "chatRooms"), {
        roomName: roomName.trim(),
        isGroupChat: true,
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentUser.uid,
        participants: [currentUser.uid],
        participantNames: [userInfo.name],
        participantNicknames: [userInfo.nickname],
        lastRead: { [currentUser.uid]: new Date() },
      });
      const link = `${window.location.origin}/chat/group/${docRef.id}`;
      setInviteLink(link);
      await navigator.clipboard.writeText(link);
      alert("채팅방이 생성되었고, 초대 링크가 복사되었습니다!");
      setRoomName('');
      setMaxParticipants('');
    } catch (err) {
      console.error("채팅방 생성 오류:", err);
      alert("채팅방 생성에 실패했습니다.");
    }
  };

  return (
    <Modal
  isOpen={isOpen}
  onRequestClose={onRequestClose}
  style={{
    overlay: { backgroundColor: 'rgba(0,0,0,0.6)' },
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
      width: '340px',
      maxWidth: '95vw',
      padding: '20px',
      border: 'none',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    }
  }}
>
  <h3>자유 채팅방 만들기</h3>
  {/* 방 생성 전: 입력창/버튼 */}
  {!inviteLink && (
    <>
      <div className="form-group">
        <input
          type="text"
          placeholder="채팅방 이름 입력"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
        />
      </div>
      <div className="form-group">
        <input
          type="number"
          placeholder="최대 인원 수 (예: 10, 비워두면 무제한)"
          value={maxParticipants}
          onChange={(e) => setMaxParticipants(e.target.value)}
        />
      </div>
      <div className="modal-actions">
        <button className="button-secondary" onClick={onRequestClose}>취소</button>
        <button className="button-primary" onClick={handleCreate}>생성</button>
      </div>
    </>
  )}
  {/* 방 생성 후: 초대 링크/QR 안내만 */}
  {inviteLink && (
    <div style={{ margin: '16px 0', textAlign: 'center' }}>
      <div style={{ marginBottom: 8, color: '#1976d2', fontWeight: 600 }}>
        초대 링크가 복사되었습니다!
      </div>
      <input
        value={inviteLink}
        readOnly
        style={{ width: '100%', marginBottom: 12, fontSize: 13, color: '#1976d2', textAlign: 'center' }}
        onClick={e => { e.target.select(); }}
      />
      <QRCodeSVG value={inviteLink} size={120} />
      <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
        QR코드를 스캔하거나 링크를 전달해 참여할 수 있습니다.
      </div>
      <button className="button-primary" style={{ marginTop: 16 }} onClick={onRequestClose}>닫기</button>
    </div>
  )}
</Modal>
  );
};

export default ChatCreateModal;