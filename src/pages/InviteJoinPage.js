// src/pages/InviteJoinPage.js

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const InviteJoinPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('진행 중');

  useEffect(() => {
    const joinRoom = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setStatus('로그인이 필요합니다.');
        return;
      }

      try {
        const roomRef = doc(db, 'chatRooms', roomId);
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) {
          setStatus('채팅방이 존재하지 않습니다.');
          return;
        }

        const roomData = roomSnap.data();
        const { participants = [], participantNicknames = [], participantNames = [], leftUsers = {} } = roomData;

        if (!participants.includes(currentUser.uid)) {
          // 새로 참여
          await updateDoc(roomRef, {
            participants: [...participants, currentUser.uid],
            participantNicknames: [...participantNicknames, currentUser.displayName || '이름없음'],
            participantNames: [...participantNames, currentUser.displayName || '이름없음'],
            [`leftUsers.${currentUser.uid}`]: false,
            updatedAt: serverTimestamp()
          });
          setStatus('채팅방에 참여되었습니다.');
        } else if (leftUsers[currentUser.uid]) {
          // 나갔다가 다시 참여
          await updateDoc(roomRef, {
            [`leftUsers.${currentUser.uid}`]: false,
            updatedAt: serverTimestamp()
          });
          setStatus('채팅방에 다시 참여하였습니다.');
        } else {
          setStatus('이미 참여중입니다.');
        }

        setTimeout(() => navigate(`/chat/${roomId}`), 1500);
      } catch (err) {
        console.error('참여 오류:', err);
        setStatus('오류가 발생했습니다.');
      }
    };

    joinRoom();
  }, [roomId, navigate]);

  return (
    <div className="invite-page" style={{ padding: '40px', textAlign: 'center' }}>
      <h2>초대 참여 처리</h2>
      <p>{status}</p>
    </div>
  );
};

export default InviteJoinPage;