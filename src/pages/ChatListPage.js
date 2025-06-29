import React, { useState, useEffect } from 'react';
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
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import CommunityCard from '../components/CommunityCard';
import MessageModal from '../components/MessageModal';
import ChatModal from '../components/ChatModal';
import ChatCreateModal from '../components/ChatCreateModal';

const ChatListPage = ({ userInfo }) => {
  const [chatRooms, setChatRooms] = useState([]);
  const [exitedRooms, setExitedRooms] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [selectedUserUids, setSelectedUserUids] = useState([]);
  const [selectedUserNames, setSelectedUserNames] = useState([]);
  const [selectedUserNicknames, setSelectedUserNicknames] = useState([]);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const navigate = useNavigate();
  const currentUser = auth.currentUser;
  const oneToOneRooms = chatRooms.filter(room => !room.isGroupChat);
  const groupRooms = chatRooms.filter(room => room.isGroupChat);

  useEffect(() => {
    const fetchUsersMap = async () => {
      const usersSnap = await getDocs(collection(db, 'users'));
      const map = {};
      usersSnap.docs.forEach(doc => {
        const data = doc.data();
        map[doc.id] = data.nickname || '닉네임없음';
      });
      setUsersMap(map);
    };
    fetchUsersMap();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'chatRooms'),
      where('participants', 'array-contains', currentUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log('Firestore data snapshot:', querySnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })));
      const active = [];
      const exited = [];

      querySnapshot.forEach(docSnap => {
        const room = { id: docSnap.id, ...docSnap.data() };
        const myLastRead = room.lastRead?.[currentUser.uid]?.toDate();
        const lastMessageTime = room.updatedAt?.toDate();
        const hasUnread = myLastRead && lastMessageTime && lastMessageTime > myLastRead;
        room.hasUnread = hasUnread;

        if (room.leftUsers?.[currentUser.uid]) {
          exited.push(room);
        } else {
          active.push(room);
        }
      });

      setChatRooms(active);
      setExitedRooms(exited);
      setLoading(false);
    }, (error) => {
      console.error('onSnapshot error:', error);
      alert('채팅방 데이터를 불러오는 데 실패했습니다. 네트워크 연결을 확인하세요.');
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const inviteRef = collection(db, 'chatRooms');
    const q = query(inviteRef);
    const unsubscribe = onSnapshot(q, async (roomsSnap) => {
      const results = [];
      for (const docSnap of roomsSnap.docs) {
        const roomId = docSnap.id;
        const inviteDoc = doc(db, 'chatRooms', roomId, 'invitations', currentUser.uid);
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
    const roomRef = doc(db, 'chatRooms', roomId);
    try {
      const roomSnap = await getDoc(roomRef);
      if (!roomSnap.exists()) return alert('채팅방이 존재하지 않습니다.');

      const roomData = roomSnap.data();

      await updateDoc(roomRef, {
        participants: [...(roomData.participants || []), currentUser.uid],
        participantNames: [...(roomData.participantNames || []), userInfo.name],
        participantNicknames: [...(roomData.participantNicknames || []), userInfo.nickname],
        [`leftUsers.${currentUser.uid}`]: false,
        updatedAt: serverTimestamp(),
      });

      await deleteDoc(doc(db, 'chatRooms', roomId, 'invitations', currentUser.uid));
      alert('채팅방에 참여했습니다.');
      navigate(`/chat/${roomId}`);
    } catch (err) {
      console.error('참여 오류:', err);
      alert('참여에 실패했습니다.');
    }
  };

  const handleCreateFreeRoom = async () => {
  if (!newRoomName.trim()) return alert('채팅방 이름을 입력해주세요.');
  if (maxParticipants && isNaN(Number(maxParticipants))) return alert('최대 인원은 숫자로 입력하세요!');

  const participants = [currentUser.uid];
  const participantNames = [userInfo.name];
  const participantNicknames = [userInfo.nickname];

  try {
    const roomRef = await addDoc(collection(db, 'chatRooms'), {
      roomName: newRoomName,
      maxParticipants: maxParticipants ? Number(maxParticipants) : null,
      createdBy: currentUser.uid,
      participantNames,
      participantNicknames,
      participants,
      leftUsers: {},
      lastRead: { [currentUser.uid]: new Date() },
      updatedAt: serverTimestamp(),
    });
    setShowCreateRoomModal(false);
    setNewRoomName('');
    setMaxParticipants('');
    // 참여자 선택 관련 상태 모두 삭제
    navigate(`/chat/${roomRef.id}`);
  } catch (err) {
    console.error('채팅방 생성 오류:', err);
    alert('채팅방 생성에 실패했습니다.');
  }
};

  const handleMessage = (applicant) => {
    setSelectedUser(applicant);
    setShowMessageModal(true);
  };

  const handleChat = (applicant) => {
    setSelectedUser(applicant);
    setShowChatModal(true);
  };

  const sendMessage = async (toUid, messageText) => {
    const ids = [currentUser.uid, toUid].sort();
    const roomId = ids.join('_');
    return addDoc(collection(db, 'directChats', roomId, 'messages'), {
      text: messageText,
      createdAt: serverTimestamp(),
      uid: currentUser.uid,
      userName: userInfo.nickname || userInfo.email || userInfo.name || '',
      to: toUid,
      from: currentUser.uid,
    });
  };

  const handleEnterRoom = (roomId) => {
    console.log('Navigating to chat room with id:', roomId);
    if (!roomId) {
      console.error('roomId is undefined');
      alert('채팅방 ID가 올바르지 않습니다.');
      return;
    }
    navigate(`/chat/${roomId}`);
  };

  if (loading) return <div className="loading-screen">채팅방 목록을 불러오는 중...</div>;

  const getApplicantObjects = (uids) =>
    (uids || []).map(uid => ({
      uid,
      nickname: usersMap[uid] || '닉네임없음',
    }));

  return (
    <div className="chat-list-page container">
      <h2>채팅</h2>
      <div className="chat-sections-container" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div className="card chat-section" style={{ flex: 1, minWidth: '280px', background: '#fff', borderRadius: '10px', padding: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
          <h3>내 채팅방 목록</h3>
          <ul style={{ padding: 0, listStyle: 'none' }}>
            {oneToOneRooms.length > 0 && (
              <>
                <h4 style={{ margin: '12px 0 4px 0', color: '#1976d2' }}>1:1 채팅방</h4>
                {oneToOneRooms.map(room => {
                  const otherUid = room.participants.find(uid => uid !== currentUser.uid);
                  const otherName = (room.participantNicknames && room.participantNicknames[room.participants.indexOf(otherUid)]) || usersMap[otherUid] || '닉네임없음';
                  return (
                    <li key={room.id} style={{ background: '#fff', marginBottom: '8px', padding: '12px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                      <CommunityCard
                        id={room.id}
                        title={otherName}
                        content={room.lastMessage || ''}
                        category="1:1 채팅"
                        status={room.hasUnread ? 'unread' : 'read'}
                        applicants={getApplicantObjects(room.participants)}
                        authorName={otherName}
                        currentUser={currentUser}
                        onEnterRoom={() => handleEnterRoom(room.id)}
                        onMessage={handleMessage}
                        onChat={handleChat}
                        extraFields={<div style={{ fontSize: 12, color: '#666' }}>1:1 대화</div>}
                        isChatRoom={true}
                        loading={loading} // Pass loading prop
                      />
                    </li>
                  );
                })}
              </>
            )}

            {groupRooms.length > 0 && (
  <>
    <h4 style={{ margin: '16px 0 4px 0', color: '#1976d2' }}>그룹 채팅방</h4>
    {groupRooms.map(room => (
      <li key={room.id} style={{ background: '#fff', marginBottom: '8px', padding: '12px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
        <CommunityCard
          id={room.id} // ✅ 반드시 chatRooms의 id! (Firestore 문서 id)
          isGroupChat={room.isGroupChat} // ✅ 그룹채팅방 여부
          title={room.roomName}
          content={room.lastMessage || ''}
          category="그룹채팅"
          status={room.hasUnread ? 'unread' : 'read'}
          applicants={getApplicantObjects(room.participants)}
          authorName={usersMap[room.createdBy] || '익명'}
          currentUser={currentUser}
          onEnterRoom={() => handleEnterRoom(room.id)}
          onMessage={handleMessage}
          onChat={handleChat}
          extraFields={<div style={{ fontSize: 12, color: '#666' }}>{room.participants.length}명 참여중</div>}
          isChatRoom={true}
          loading={loading}
        />
      </li>
    ))}
  </>
)}
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
  <ChatCreateModal
    isOpen={showCreateRoomModal}
    onRequestClose={() => setShowCreateRoomModal(false)}
    userInfo={userInfo}
  />
)}

      {showMessageModal && selectedUser && (
        <MessageModal
          open={showMessageModal}
          onClose={() => setShowMessageModal(false)}
          fromUser={userInfo}
          toUser={selectedUser}
          onSend={sendMessage}
        />
      )}
      {showChatModal && selectedUser && (
        <ChatModal
          open={showChatModal}
          onClose={() => setShowChatModal(false)}
          fromUser={userInfo}
          toUser={selectedUser}
        />
      )}
    </div>
  );
};

export default ChatListPage;