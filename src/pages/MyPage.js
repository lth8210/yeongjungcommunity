import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, where, doc, updateDoc, deleteDoc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Link } from 'react-router-dom';
import { deleteUser } from 'firebase/auth';
import CommunityCard from '../components/CommunityCard';
import { ADMIN_UIDS } from '../config';
import MessageModal from '../components/MessageModal';
// import ChatModal from '../components/ChatModal';
import { useNavigate } from 'react-router-dom';
import { findOrCreateOneToOneRoom } from '../utils/findOrCreateOneToOneRoom';

const MAX_VISIBLE_PARTICIPANTS = 5;

// `MeetingList.js`와 동일한 카테고리 정의 추가
const CATEGORY_LABELS = {
  hobby: '취미',
  study: '학습',
  volunteer: '봉사',
  etc: '기타',
};

const MyPage = ({ userInfo }) => {
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [name, setName] = useState(userInfo.name || '');
  const [nickname, setNickname] = useState(userInfo.nickname || '');
  const [phone, setPhone] = useState(userInfo.phone || '');
  const [openRoomId, setOpenRoomId] = useState(null);
  const [myMeetings, setMyMeetings] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [myOwnedMeetings, setMyOwnedMeetings] = useState([]);
  const [pendingMeetings, setPendingMeetings] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [isEditingMeeting, setIsEditingMeeting] = useState(null); // 현재 편집 중인 모임 ID
  const [editedMeeting, setEditedMeeting] = useState({}); // 편집 중인 모임 데이터

  const handleMessage = (applicant) => {
  setSelectedUser(applicant);
  setShowMessageModal(true);
};

const handleChat = async (userObj) => {
  if (!userInfo) return;

  // 그룹채팅/모임채팅: groupId가 있으면 그룹채팅방으로 이동
  if (userObj && (userObj.type === 'group' || userObj.groupId)) {
    const groupId = userObj.groupId || userObj.meetingId || userObj.id;
    navigate(`/chat/group/${groupId}`);
    return;
  }

  // 1:1 채팅방
  if (userObj && userObj.uid) {
    if (userObj.uid === userInfo.uid) return;
    try {
      const myUid = userInfo.uid;
      const myName = userInfo.name || userInfo.nickname || userInfo.email;
      const myNickname = userInfo.nickname || userInfo.name || userInfo.email;
      const otherUid = userObj.uid;
      const otherName = userObj.name || userObj.nickname || userObj.email;
      const otherNickname = userObj.nickname || userObj.name || userObj.email;
      const roomId = await findOrCreateOneToOneRoom(
        myUid,
        myName,
        myNickname,
        otherUid,
        otherName,
        otherNickname
      );
      navigate(`/chat/${roomId}`);
    } catch (err) {
      alert('채팅방 생성 실패');
      console.error(err);
    }
    return;
  }
  alert('채팅 상대 정보가 올바르지 않습니다.');
};

const handleEnterGroupChat = (roomId) => {
  if (!roomId) {
    alert("연결된 채팅방 정보가 없습니다.");
    return;
  }
  navigate(`/chat/${roomId}`);
};

  const sendMessage = async (toUid, messageText) => {
  if (!userInfo || !toUid || !messageText.trim()) return;
  const ids = [userInfo.uid, toUid].sort();
  const roomId = ids.join('_');
  await addDoc(collection(db, 'directChats', roomId, 'messages'), {
    text: messageText,
    createdAt: serverTimestamp(),
    uid: userInfo.uid,
    userName: userInfo.nickname || userInfo.email || userInfo.name || '',
    to: toUid,
    from: userInfo.uid,
  });
};

  useEffect(() => {
    const fetchUsersMap = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const map = {};
        usersSnap.docs.forEach(doc => {
          const data = doc.data();
          map[doc.id] = data.nickname || '닉네임없음';
        });
        setUsersMap(map);
      } catch (error) {
        console.error('사용자 정보 로드 실패:', error);
      }
    };
    fetchUsersMap();
  }, []);

  useEffect(() => {
    const fetchMeetingData = async () => {
      if (!userInfo?.uid) return;
      try {
        const q = query(collection(db, 'meetings'), orderBy('meetingTime', 'desc'));
        const snapshot = await getDocs(q);
        const allMeetings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setMyOwnedMeetings(allMeetings.filter(m => m.creatorId === userInfo.uid));
        setMyMeetings(allMeetings.filter(m => Array.isArray(m.applicants) && m.applicants.includes(userInfo.uid)));
        setPendingMeetings(allMeetings.filter(m => Array.isArray(m.pendingApplicants) && m.pendingApplicants.includes(userInfo.uid)));
      } catch (error) {
        console.error('모임 데이터 로드 실패:', error);
      }
    };
    fetchMeetingData();
  }, [userInfo]);

  useEffect(() => {
    const fetchMyPosts = async () => {
      if (!userInfo?.uid) return;
      try {
        const q = query(collection(db, 'posts'), where('authorId', '==', userInfo.uid), orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        setMyPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('내가 쓴 글 로드 실패:', error);
      }
    };
    fetchMyPosts();
  }, [userInfo]);

  useEffect(() => {
    const fetchChatRooms = async () => {
      if (!userInfo?.uid) return;
      try {
        const q = query(collection(db, 'chatRooms'));
        const snapshot = await getDocs(q);
        const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const myRoomsPromises = rooms
          .filter(room => Array.isArray(room.participants) && room.participants.includes(userInfo.uid))
          .map(async room => {
            if (room.linkedMeetingId) {
              const meetingDoc = await getDoc(doc(db, 'meetings', room.linkedMeetingId));
              return meetingDoc.exists() ? room : null;
            }
            return room;
          });
        const myRooms = (await Promise.all(myRoomsPromises)).filter(room => room !== null);
        setChatRooms(myRooms);
      } catch (error) {
        console.error('채팅방 로드 실패:', error);
      }
    };
    fetchChatRooms();
  }, [userInfo]);

  const getApplicantObjects = (arr) =>
    Array.isArray(arr)
      ? arr.map(uid => ({
          uid,
          nickname: usersMap[uid] || '닉네임없음',
          isAdmin: ADMIN_UIDS.includes(uid),
        }))
      : [];

  const handleProfileSave = async () => {
    try {
      const userRef = doc(db, 'users', userInfo.uid);
      await updateDoc(userRef, { name, phone, nickname });
      alert('프로필이 수정되었습니다.');
      setIsEditingProfile(false);
    } catch (error) {
      console.error('프로필 수정 실패:', error);
      alert('프로필 수정 실패: ' + error.message);
    }
  };

  const handleDeleteMeeting = async (meetingId) => {
    if (!userInfo?.uid) return;
    if (!window.confirm('모임을 삭제하시겠습니까?')) return;
    try {
      const meetingRef = doc(db, 'meetings', meetingId);
      const meetingDoc = await getDoc(meetingRef);
      if (meetingDoc.exists() && meetingDoc.data().creatorId === userInfo.uid) {
        if (meetingDoc.data().chatRoomId) {
          await deleteDoc(doc(db, 'chatRooms', meetingDoc.data().chatRoomId));
        }
        await deleteDoc(meetingRef);
        setMyOwnedMeetings(prev => prev.filter(m => m.id !== meetingId));
        setMyMeetings(prev => prev.filter(m => m.id !== meetingId));
        setPendingMeetings(prev => prev.filter(m => m.id !== meetingId));
        alert('모임이 삭제되었습니다.');
      } else {
        alert('삭제 권한이 없습니다.');
      }
    } catch (error) {
      console.error('모임 삭제 실패:', error);
      alert('모임 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleLeaveChatRoom = async (roomId) => {
    if (!userInfo?.uid) return;
    if (!window.confirm('채팅방에서 나가시겠습니까?')) return;
    try {
      const roomRef = doc(db, 'chatRooms', roomId);
      const roomDoc = await getDoc(roomRef);
      if (roomDoc.exists()) {
        const roomData = roomDoc.data();
        if (Array.isArray(roomData.participants) && roomData.participants.includes(userInfo.uid)) {
          const updatedParticipants = roomData.participants.filter(uid => uid !== userInfo.uid);
          await updateDoc(roomRef, { participants: updatedParticipants });
          setChatRooms(prev => prev.filter(room => room.id !== roomId));
          alert('채팅방에서 나왔습니다.');
        } else {
          alert('이미 채팅방에서 나갔거나 권한이 없습니다.');
        }
      } else {
        alert('해당 채팅방이 존재하지 않습니다.');
        setChatRooms(prev => prev.filter(room => room.id !== roomId));
      }
    } catch (error) {
      console.error('채팅방 나가기 실패:', error);
      alert('채팅방 나가기 중 오류가 발생했습니다.');
    }
  };

  const handleWithdraw = async () => {
    if (!window.confirm('회원 탈퇴를 진행하시겠습니까? 복구가 불가능합니다.')) return;
    try {
      const userRef = doc(db, 'users', userInfo.uid);
      await updateDoc(userRef, {
        isDisabled: true,
        deletedAt: new Date(),
        nickname: '탈퇴회원',
        name: '',
        email: `deleted_${userInfo.uid}@example.com`,
      });
      const userAuth = auth.currentUser;
      if (userAuth) await deleteUser(userAuth);
      alert('회원 탈퇴가 완료되었습니다.');
      window.location.href = '/';
    } catch (error) {
      console.error('회원 탈퇴 실패:', error);
      alert('회원 탈퇴 중 오류가 발생했습니다.');
    }
  };

  const handleClosePopup = () => setOpenRoomId(null);

  const handleEdit = (meeting) => {
    setIsEditingMeeting(meeting.id);
    setEditedMeeting({ ...meeting });
  };

  const handleSave = async (meetingId) => {
    if (!userInfo?.uid) {
      alert('로그인이 필요합니다.');
      return;
    }
    const isAuthor = userInfo.uid === editedMeeting.creatorId;
    if (!isAuthor && !ADMIN_UIDS.includes(userInfo.uid)) {
      alert('수정 권한이 없습니다.');
      return;
    }
    try {
      const meetingRef = doc(db, 'meetings', meetingId);
      await updateDoc(meetingRef, {
        title: editedMeeting.title,
        description: editedMeeting.description,
        location: editedMeeting.location,
        meetingTime: editedMeeting.meetingTime,
        category: editedMeeting.category,
      });
      setMyOwnedMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, ...editedMeeting } : m));
      setMyMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, ...editedMeeting } : m));
      setIsEditingMeeting(null);
      setEditedMeeting({});
      alert('모임이 수정되었습니다.');
    } catch (error) {
      console.error('모임 수정 실패:', error);
      alert('모임 수정 중 오류가 발생했습니다.');
    }
  };

  const handleCancelEdit = () => {
    setIsEditingMeeting(null);
    setEditedMeeting({});
  };

  return (
    <div className="mypage-container" style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="card" style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px' }}>프로필 정보</h3>
        {isEditingProfile ? (
          <>
            <div style={{ marginBottom: 8 }}>
              <label>닉네임: </label>
              <input
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                style={{ width: '100%', padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
                aria-label="닉네임 수정"
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>이름(실명): </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ width: '100%', padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
                aria-label="이름 수정"
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>전화번호: </label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={{ width: '100%', padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
                aria-label="전화번호 수정"
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleProfileSave}
                style={{ padding: '6px 12px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                aria-label="프로필 저장"
              >
                저장
              </button>
              <button
                onClick={() => setIsEditingProfile(false)}
                style={{ padding: '6px 12px', background: '#ccc', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                aria-label="프로필 수정 취소"
              >
                취소
              </button>
            </div>
          </>
        ) : (
          <>
            <p><strong>이메일:</strong> {userInfo.email}</p>
            <p><strong>실명:</strong> {userInfo.name}</p>
            <p><strong>닉네임:</strong> {userInfo.nickname}</p>
            <p><strong>전화번호:</strong> {userInfo.phone || '등록되지 않음'}</p>
            <button
              onClick={() => setIsEditingProfile(true)}
              style={{ padding: '6px 12px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', marginTop: 8 }}
              aria-label="프로필 수정"
            >
              프로필 수정
            </button>
          </>
        )}
      </div>

      <div className="card" style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px' }}>내가 쓴 글 목록</h3>
        {myPosts.length > 0 ? (
          myPosts.map(post => (
            <CommunityCard
              key={post.id}
              meetingId={post.id}
              title={post.title}
              content={post.content}
              category={post.category}
              status={post.status}
              applicants={getApplicantObjects(post.applicants)}
              authorName={post.authorName}
              currentUser={userInfo}
              onMessage={targetUser => { setSelectedUser(targetUser); setShowMessageModal(true); }}
              onChat={targetUser => { setSelectedUser(targetUser); setShowChatModal(true); }}
              thumbnail={post.thumbnail || '/placeholder.png'}
            />
          ))
        ) : (
          <p>작성한 글이 없습니다.</p>
        )}
      </div>

      <div className="card" style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px' }}>받은 쪽지함</h3>
        <p>다른 회원에게 받은 쪽지를 확인해보세요.</p>
        <Link to="/my-messages">
          <button
            style={{ padding: '6px 12px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            aria-label="받은 쪽지 보기"
          >
            📨 받은 쪽지 보기
          </button>
        </Link>
      </div>

      <div className="card" style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px' }}>내가 주최한 모임</h3>
        {myOwnedMeetings.length > 0 ? (
          myOwnedMeetings.map(meeting => {
            const editing = isEditingMeeting === meeting.id;
            const isAuthor = userInfo?.uid === meeting.creatorId;
            return (
              <CommunityCard
                key={meeting.id}
                meetingId={meeting.id}
                title={editing ? (
                  <input
                    value={editedMeeting.title || ''}
                    onChange={(e) => setEditedMeeting({ ...editedMeeting, title: e.target.value })}
                    style={{ width: '100%', padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
                  />
                ) : meeting.title}
                content={editing ? (
                  <textarea
                    value={editedMeeting.description || ''}
                    onChange={(e) => setEditedMeeting({ ...editedMeeting, description: e.target.value })}
                    style={{ width: '100%', minHeight: 80, padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
                  />
                ) : meeting.description}
                location={editing ? (
                  <input
                    value={editedMeeting.location || ''}
                    onChange={(e) => setEditedMeeting({ ...editedMeeting, location: e.target.value })}
                    style={{ width: '100%', padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
                  />
                ) : meeting.location}
                category={editing ? (
                  <select
                    value={editedMeeting.category || ''}
                    onChange={(e) => setEditedMeeting({ ...editedMeeting, category: e.target.value })}
                    style={{ width: '100%', padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
                  >
                    {Object.keys(CATEGORY_LABELS).map((key) => (
                      <option key={key} value={key}>{CATEGORY_LABELS[key]}</option>
                    ))}
                  </select>
                ) : CATEGORY_LABELS[meeting.category] || '기타'}
                status={meeting.status}
                applicants={getApplicantObjects(meeting.applicants)}
                isApplicant={meeting.applicants?.includes(userInfo.uid)}
                isAuthor={isAuthor}
                isAdmin={ADMIN_UIDS.includes(userInfo?.uid)}
                authorName={meeting.hostName}
                currentUser={userInfo}
                extraFields={
                  <>
                    <p><strong>일시:</strong> {new Date(editing ? editedMeeting.meetingTime || meeting.meetingTime : meeting.meetingTime).toLocaleString('ko-KR')}</p>
                    <p><strong>장소:</strong> {editing ? editedMeeting.location || meeting.location : meeting.location}</p>
                    {(isAuthor || ADMIN_UIDS.includes(userInfo?.uid)) && editing && (
                      <>
                        <button
                          onClick={() => handleSave(meeting.id)}
                          style={{ padding: '4px 8px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, marginTop: 8, marginRight: 8 }}
                        >
                          저장
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          style={{ padding: '4px 8px', background: '#ccc', border: 'none', borderRadius: 4, marginTop: 8 }}
                        >
                          취소
                        </button>
                      </>
                    )}
                  </>
                }
                onDelete={() => handleDeleteMeeting(meeting.id)}
                onEdit={() => handleEdit(meeting)}
                onMessage={handleMessage} // 이 줄 추가
                onChat={handleChat}       // 이 줄 추가
                onEnterGroupChat={() => handleEnterGroupChat(meeting.chatRoomId)}
                thumbnail={meeting.thumbnail || '/placeholder.png'}
              />
            );
          })
        ) : (
          <p>주최한 모임이 없습니다.</p>
        )}
      </div>

      <div className="card" style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px' }}>내가 참여 확정된 모임</h3>
        {myMeetings.length > 0 ? (
          myMeetings.map(meeting => (
            <CommunityCard
              key={meeting.id}
              meetingId={meeting.id}
              title={meeting.title}
              content={meeting.description}
              location={meeting.location}
              category={meeting.category}
              status={meeting.status}
              applicants={getApplicantObjects(meeting.applicants)}
              authorName={meeting.hostName}
              currentUser={userInfo}
              isApplicant={meeting.applicants?.includes(userInfo.uid)}
              isAuthor={userInfo?.uid === meeting.creatorId}
              isAdmin={ADMIN_UIDS.includes(userInfo?.uid)}
              extraFields={
                <>
                  <p><strong>일시:</strong> {new Date(meeting.meetingTime).toLocaleString('ko-KR')}</p>
                  <p><strong>장소:</strong> {meeting.location}</p>
                </>
              }
              onMessage={handleMessage} // 이 줄 추가
              onChat={handleChat}       // 이 줄 추가
              onEnterGroupChat={() => handleEnterGroupChat(meeting.chatRoomId)}
              thumbnail={meeting.thumbnail || '/placeholder.png'}
            />
          ))
        ) : (
          <p>참여 확정된 모임이 없습니다.</p>
        )}
      </div>

      <div className="card" style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px' }}>신청했으나 대기 중인 모임</h3>
        {pendingMeetings.length > 0 ? (
          pendingMeetings.map(meeting => (
            <CommunityCard
              key={meeting.id}
              meetingId={meeting.id}
              title={meeting.title}
              content={meeting.description}
              location={meeting.location}
              category={meeting.category}
              status={meeting.status}
              applicants={getApplicantObjects(meeting.pendingApplicants)}
              authorName={meeting.hostName}
              currentUser={userInfo}
              isApplicant={meeting.applicants?.includes(userInfo.uid)}
              isAuthor={userInfo?.uid === meeting.creatorId}
              isAdmin={ADMIN_UIDS.includes(userInfo?.uid)}
              extraFields={
                <>
                  <p><strong>일시:</strong> {new Date(meeting.meetingTime).toLocaleString('ko-KR')}</p>
                  <p><strong>장소:</strong> {meeting.location}</p>
                </>
              }
              onMessage={targetUser => { setSelectedUser(targetUser); setShowMessageModal(true); }}
              onChat={targetUser => { setSelectedUser(targetUser); setShowChatModal(true); }}
              thumbnail={meeting.thumbnail || '/placeholder.png'}
            />
          ))
        ) : (
          <p>대기 중인 모임이 없습니다.</p>
        )}
      </div>

      <div className="card" style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px' }}>참여 중인 채팅방</h3>
        {chatRooms.length === 0 ? (
          <p>참여 중인 채팅방이 없습니다.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {chatRooms.map(room => {
              const roomTitle = room.roomName?.trim() || '제목 없음';
              const participantUids = room.participants || [];
              const participantNicknames = participantUids.map(uid => usersMap[uid] || '닉네임없음');
              const visible = participantNicknames.slice(0, MAX_VISIBLE_PARTICIPANTS);
              const hidden = participantNicknames.slice(MAX_VISIBLE_PARTICIPANTS);

              return (
                <li key={room.id} style={{ marginBottom: 12, position: 'relative' }}>
                  <Link
                    to={`/chat/${room.id}`}
                    style={{ color: '#1976d2', textDecoration: 'underline', fontSize: 16 }}
                    aria-label={`${roomTitle} 채팅방으로 이동`}
                  >
                    {roomTitle} <span style={{ marginLeft: 4 }}>🔔</span>
                  </Link>
                  <div style={{ color: '#666', fontSize: 14, marginTop: 4 }}>
                    👥 참가자: {visible.join(', ')}
                    {hidden.length > 0 && (
                      <span
                        style={{ color: '#1971c2', fontWeight: 600, cursor: 'pointer', marginLeft: 8 }}
                        onClick={() => setOpenRoomId(room.id)}
                        aria-label={`${hidden.length}명 더보기`}
                      >
                        +{hidden.length}명 더보기
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleLeaveChatRoom(room.id)}
                    style={{ padding: '4px 8px', background: '#ff4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', marginTop: 4 }}
                    aria-label="채팅방 나가기"
                  >
                    나가기
                  </button>
                  {openRoomId === room.id && (
                    <>
                      <div
                        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.01)', zIndex: 999 }}
                        onClick={handleClosePopup}
                        aria-label="팝업 닫기"
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          background: '#fff',
                          border: '1px solid #ccc',
                          borderRadius: 8,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          padding: 12,
                          zIndex: 1000,
                          minWidth: 160,
                        }}
                      >
                        <button
                          style={{ position: 'absolute', top: 4, right: 6, background: 'none', border: 'none', fontSize: 18, color: '#999', cursor: 'pointer' }}
                          onClick={handleClosePopup}
                          aria-label="닫기"
                        >
                          ×
                        </button>
                        <div style={{ marginTop: 20 }}>
                          {hidden.map((nickname, idx) => (
                            <div key={idx} style={{ marginBottom: 6 }}>{nickname}</div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="card" style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px' }}>회원 탈퇴</h3>
        <p>회원 탈퇴 시 계정 정보가 영구적으로 삭제되며 복구할 수 없습니다.</p>
        <button
          onClick={handleWithdraw}
          style={{ padding: '6px 12px', background: '#ff4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          aria-label="회원 탈퇴"
        >
          회원 탈퇴하기
        </button>
      </div>

      {showMessageModal && selectedUser && (
  <MessageModal
    open={showMessageModal}
    onClose={() => setShowMessageModal(false)}
    fromUser={userInfo}
    toUser={selectedUser}
    onSend={sendMessage}   // ✅ 반드시 추가!
  />
)}
    </div>
  );
};

export default MyPage;