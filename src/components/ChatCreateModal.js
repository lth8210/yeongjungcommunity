// src/components/ChatCreateModal.js
import { useState } from 'react';
import Modal from 'react-modal';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import './ChatCreateModal.css'; // 스타일링을 위한 CSS 파일 import

Modal.setAppElement('#root');

const ChatCreateModal = ({ isOpen, onRequestClose, userInfo }) => {
  const [roomName, setRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');

  const handleCreate = async () => {
    const currentUser = auth.currentUser;
    if (!roomName.trim()) {
        alert("채팅방 이름을 입력해주세요.");
        return;
    }
    if (isPrivate && !password.trim()) {
        alert("비공개 채팅방은 비밀번호를 입력해야 합니다.");
        return;
    }

    try {
      await addDoc(collection(db, "chatRooms"), {
        roomName: roomName.trim(),
        isGroupChat: true, // 자유 채팅방은 그룹채팅으로 간주
        isPrivate,
        password: isPrivate ? password.trim() : null,
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : null, // 일단 주석 처리
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentUser.uid,
        participants: [currentUser.uid],
        participantNames: [userInfo.name],
        participantNicknames: [userInfo.nickname],
        lastRead: { [currentUser.uid]: new Date() },
      });
      alert("채팅방이 생성되었습니다.");
      setRoomName('');
      setIsPrivate(false);
      setPassword('');
      // setMaxParticipants('');
      onRequestClose();
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
          width: '90%',
          maxWidth: '400px',
          padding: '24px',
          border: 'none',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }
      }}
    >
      <h3>자유 채팅방 만들기</h3>
      
      <div className="form-group">
        <input
          type="text"
          placeholder="채팅방 이름 입력"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
        />
      </div>

      {/* ✅ 체크박스 UI 정렬 문제 해결 */}
      <div className="form-group checkbox-group">
        <label htmlFor="isPrivateCheckbox">비공개 채팅방</label>
        <input
          id="isPrivateCheckbox"
          type="checkbox"
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.target.checked)}
        />
      </div>

      {isPrivate && (
        <div className="form-group">
          <input
            type="password"
            placeholder="비밀번호 입력"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      )}

      { 
      <div className="form-group">
        <input
          type="number"
          placeholder="최대 인원 수 (예: 10, 비워두면 무제한)"
          value={maxParticipants}
          onChange={(e) => setMaxParticipants(e.target.value)}
        />
      </div>
      }

      <div className="modal-actions">
        <button className="button-secondary" onClick={onRequestClose}>취소</button>
        <button className="button-primary" onClick={handleCreate}>생성</button>
      </div>
    </Modal>
  );
};

export default ChatCreateModal;