// src/pages/ChatRoomPage.js

import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
  getDocs,
  where,
  setDoc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { Picker } from 'emoji-mart';
import Modal from 'react-modal';

// Modal의 root element 설정 (웹 접근성 경고 방지)
Modal.setAppElement('#root');

const ChatRoomPage = ({ userInfo }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [roomInfo, setRoomInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeList, setNoticeList] = useState([]);
  const [newNotice, setNewNotice] = useState({ title: '', content: '' });
  const messagesEndRef = useRef(null);
  const currentUser = auth.currentUser;
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollList, setPollList] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [inviteTab, setInviteTab] = useState('search');
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  const [isJoining, setIsJoining] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false); // 참여자 보기 토글
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [newPoll, setNewPoll] = useState({
    title: '',
    options: ['', ''],
    deadline: '',
    allowMultiple: false,
    isSecret: false,
    isAnonymous: false,
  });

  const menuItemStyle = {
    padding: '8px',
    cursor: 'pointer',
    borderBottom: '1px solid #eee',
    fontSize: '14px'
  };

  // --- useEffect Hooks ---
  useEffect(() => {
    if (!roomId) return;
    const roomDocRef = doc(db, "chatRooms", roomId);
    const unsubscribe = onSnapshot(roomDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setRoomInfo(docSnap.data());
      } else {
        setRoomInfo(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !currentUser?.uid || !roomInfo) return;
    if (roomInfo.participants?.includes(currentUser.uid)) {
      updateDoc(doc(db, "chatRooms", roomId), {
        [`lastRead.${currentUser.uid}`]: new Date()
      }).catch(() => {});
    }
  }, [roomId, currentUser, roomInfo]);

  useEffect(() => {
    if (!roomId) return;
    const q = query(collection(db, "chatRooms", roomId, "messages"), orderBy("createdAt"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const newMessages = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        if (document.hidden && newMessages.length > messages.length) {
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage.uid !== currentUser?.uid && notificationPermission === 'granted') {
                new Notification(roomInfo?.roomName || '새 메시지', {
                    body: `${lastMessage.userName}: ${lastMessage.text}`,
                    tag: roomId,
                });
            }
        }
        setMessages(newMessages);
    }, (err) => console.error(err));
    return () => unsubscribe();
  }, [roomId, messages, notificationPermission, roomInfo, currentUser]);

  useEffect(() => {
    if (!roomId) return;
    const q = query(collection(db, "chatRooms", roomId, "announcements"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => setNoticeList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))), (err) => console.error(err));
    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    const q = query(collection(db, "chatRooms", roomId, "polls"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => setPollList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))), (err) => console.error(err));
    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const fetchRoomInfo = async () => {
      try {
        const roomRef = doc(db, 'chatRooms', roomId);
        const roomSnap = await getDoc(roomRef);

        if (!roomSnap.exists()) {
          alert('채팅방이 존재하지 않습니다.');
          navigate('/chat');
          return;
        }

        const data = roomSnap.data();
        const isParticipant = data.participants?.includes(currentUser.uid);
        const isCreator = data.createdBy === currentUser.uid;

        if (!isParticipant && !isCreator) {
          if (data.isPrivate) {
            const inputPassword = prompt("이 채팅방은 비공개입니다. 비밀번호를 입력하세요:");
            if (inputPassword !== data.password) {
              alert("비밀번호가 일치하지 않습니다.");
              navigate('/chat');
              return;
            }
          } else {
            alert("초대 수락 후 입장할 수 있습니다.");
            navigate('/chat');
            return;
          }
        }

        setRoomInfo(data);

        await updateDoc(roomRef, {
          [`lastRead.${currentUser.uid}`]: new Date()
        });
      } catch (err) {
        console.error("채팅방 정보 불러오기 실패:", err);
        alert("채팅방 입장 중 오류가 발생했습니다.");
        navigate('/chat');
      }
    };

    fetchRoomInfo();
  }, [roomId, currentUser, navigate]);

  useEffect(() => {
    if (Notification.permission !== 'granted') {
      Notification.requestPermission().then(permission => setNotificationPermission(permission));
    }

    const handlePopState = () => {
      setShowMenu(false);
      setShowNoticeModal(false);
      setShowPollModal(false);
      setShowInviteModal(false);
      setSelectedUser(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // --- Helper Functions ---
  const closeModal = (setFunction) => {
    if (window.history.state !== null) {
      window.history.back();
    }
    setFunction(false);
  };
  
  const openModalWithHistory = (setFunction) => {
    window.history.pushState({ modal: 'open' }, '', window.location.href);
    setFunction(true);
  };

  const handleEmojiSelect = (emoji) => {
    setNewMessage(prev => prev + emoji.native);
  };
  
  // --- Event Handlers ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !roomId || !userInfo?.nickname) return;
    try {
      await addDoc(collection(db, "chatRooms", roomId, "messages"), { text: newMessage, createdAt: serverTimestamp(), uid: currentUser.uid, userName: userInfo.nickname });
      await updateDoc(doc(db, "chatRooms", roomId), { lastMessage: newMessage, updatedAt: serverTimestamp(), [`lastRead.${currentUser.uid}`]: new Date() });
      setNewMessage('');
    } catch (err) { console.error("메시지 전송 오류:", err); }
  };

  const handleUserClick = async (uid) => {
    try {
      const docSnap = await getDoc(doc(db, "users", uid));
      if (docSnap.exists()) {
        openModalWithHistory(() => setSelectedUser(docSnap.data()));
      }
    } catch (err) { console.error("사용자 정보 오류:", err); }
  };

  // ✅ 강퇴 기능: 방장/운영자만 사용 가능
  const handleBanUser = async (banUid, banName) => {
    if (!window.confirm(`${banName}님을 강퇴하시겠습니까?`)) return;
    const roomRef = doc(db, "chatRooms", roomId);
    await updateDoc(roomRef, {
      [`bannedUsers.${banUid}`]: { bannedAt: serverTimestamp(), bannedBy: currentUser.uid },
      participants: roomInfo.participants.filter(uid => uid !== banUid),
      participantNames: roomInfo.participantNames.filter((_, i) => roomInfo.participants[i] !== banUid),
      participantNicknames: roomInfo.participantNicknames.filter((_, i) => roomInfo.participants[i] !== banUid),
    });
  };

  // ✅ 강퇴된 유저는 즉시 퇴장
  useEffect(() => {
    if (roomInfo?.bannedUsers && roomInfo.bannedUsers[currentUser.uid]) {
      alert("운영자에 의해 강퇴되었습니다.");
      navigate("/chat");
    }
  }, [roomInfo, currentUser, navigate]);

  const handleLeaveRoom = async () => {
    if (!currentUser || !roomInfo || !roomId) return;
    if (!window.confirm("채팅방을 나가시겠습니까?")) return;
    try {
      const roomRef = doc(db, "chatRooms", roomId);
      await updateDoc(roomRef, {
        participants: roomInfo.participants.filter(uid => uid !== currentUser.uid),
        participantNames: roomInfo.participantNames?.filter((_, i) => roomInfo.participants[i] !== currentUser.uid),
        participantNicknames: roomInfo.participantNicknames?.filter((_, i) => roomInfo.participants[i] !== currentUser.uid),
        [`lastRead.${currentUser.uid}`]: null,
        [`leftUsers.${currentUser.uid}`]: true,
        updatedAt: serverTimestamp()
      });
      alert("채팅방에서 나갔습니다.");
      navigate("/chat");
    } catch (err) { console.error("채팅방 나가기 오류:", err); }
  };

  const handleAddNotice = async () => {
    if (!newNotice.title.trim() || !newNotice.content.trim()) return alert("공지 제목과 내용을 입력해주세요.");
    try {
      await addDoc(collection(db, "chatRooms", roomId, "announcements"), { ...newNotice, createdAt: serverTimestamp(), createdBy: currentUser.uid, createdByName: userInfo.nickname });
      setNewNotice({ title: '', content: '' });
    } catch (err) { console.error("공지 등록 오류:", err); }
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return;
    const q = query(collection(db, "users"), where("nickname", ">=", searchQuery), where("nickname", "<=", searchQuery + '\uf8ff'));
    const snapshot = await getDocs(q);
    setSearchResults(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })).filter(user => user.uid !== currentUser.uid));
  };

  const handleInviteUser = async (uid, nickname) => {
    if (!roomInfo || !roomId) return;
    const invitationRef = doc(db, "chatRooms", roomId, "invitations", uid);
    try {
      await setDoc(invitationRef, { uid, nickname, invitedBy: currentUser.uid, invitedByName: userInfo.nickname, createdAt: serverTimestamp() });
      alert(`${nickname}님에게 초대장을 보냈습니다.`);
    } catch (err) { console.error("초대 오류:", err); }
  };

  const handleCreatePoll = async () => {
    const trimmedOptions = newPoll.options.map(opt => opt.trim()).filter(Boolean);
    if (!newPoll.title.trim() || trimmedOptions.length < 2) return alert("투표 제목과 최소 2개의 항목을 입력해주세요.");
    try {
      await addDoc(collection(db, "chatRooms", roomId, "polls"), {
        title: newPoll.title, options: trimmedOptions, deadline: newPoll.deadline ? Timestamp.fromDate(new Date(newPoll.deadline)) : null,
        allowMultiple: newPoll.allowMultiple, isSecret: newPoll.isSecret, isAnonymous: newPoll.isAnonymous,
        votes: {}, createdAt: serverTimestamp(), createdBy: currentUser.uid, createdByName: userInfo.nickname
      });
      setNewPoll({ title: '', options: ['', ''], deadline: '', allowMultiple: false, isSecret: false, isAnonymous: false });
      setCreatingPoll(false);
    } catch (err) { console.error("투표 생성 오류:", err); }
  };

  const handleVote = async (poll, option) => {
    const pollRef = doc(db, "chatRooms", roomId, "polls", poll.id);
    const myVotes = poll.votes?.[currentUser.uid] || [];
    let newVotes;
    if (poll.allowMultiple) {
      newVotes = myVotes.includes(option) ? myVotes.filter(v => v !== option) : [...myVotes, option];
    } else {
      newVotes = myVotes.includes(option) ? [] : [option];
    }
    await updateDoc(pollRef, { [`votes.${currentUser.uid}`]: newVotes }).catch(err => console.error("투표하기 오류: ", err));
  };

  const handleDeleteRoom = async () => {
    if (!roomInfo || roomInfo.createdBy !== currentUser.uid) return alert("채팅방을 삭제할 권한이 없습니다.");
    if (window.confirm(`'${roomInfo.roomName}' 채팅방을 정말로 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      try {
        await deleteDoc(doc(db, "chatRooms", roomId));
        alert("채팅방이 삭제되었습니다.");
        navigate("/chat");
      } catch (error) { console.error("채팅방 삭제 오류: ", error); }
    }
  };

  // 비밀번호 입력 후 자동 참여하는 함수
  const handleJoinRoom = async () => {
    if (!roomInfo || !currentUser || !userInfo) return;
    setIsJoining(true);
    try {
      await updateDoc(doc(db, "chatRooms", roomId), {
        participants: [...roomInfo.participants, currentUser.uid],
        participantNames: [...(roomInfo.participantNames || []), userInfo.name || userInfo.nickname],
        participantNicknames: [...(roomInfo.participantNicknames || []), userInfo.nickname],
      });
    } catch (error) {
      console.error("채팅방 참여 오류: ", error);
      alert("채팅방 참여에 실패했습니다.");
      setIsJoining(false);
    }
  };

  // --- Render Logic ---
  if (loading || !userInfo) {
    return <div className="loading-screen">채팅방 정보를 불러오는 중...</div>;
  }
  
  if(isJoining) {
    return <div className="loading-screen">채팅방에 참여하는 중...</div>;
  }

  // 참여자가 아닌 경우, 입장 조건 확인 로직
  if (!roomInfo || !roomInfo.participants?.includes(currentUser.uid)) {
    const handleEntryCheck = () => {
      if (!roomInfo) return <BlockedScreen message="존재하지 않는 채팅방입니다." />;
      if (roomInfo.maxParticipants && roomInfo.participants.length >= roomInfo.maxParticipants) {
        return <BlockedScreen message="채팅방 정원이 가득 찼습니다." />;
      }
      if (roomInfo.isPrivate && !roomInfo.participants?.includes(currentUser.uid)) {
        const inputPassword = prompt("이 채팅방은 비공개입니다. 비밀번호를 입력하세요:");
        if (inputPassword === null) return <BlockedScreen message="입장이 취소되었습니다." />;
        if (inputPassword !== roomInfo.password) {
          alert("비밀번호가 일치하지 않습니다.");
          return <BlockedScreen message="비밀번호가 일치하지 않습니다." />;
        }
        handleJoinRoom();
        return null;
      }
      if (!roomInfo.isPrivate && !roomInfo.participants.includes(currentUser.uid)) {
        return <BlockedScreen message="초대 후 입장할 수 있는 채팅방입니다." />;
      }
      return <BlockedScreen message="아직 이 채팅방에 참여하지 않았습니다." />;
    };
    return handleEntryCheck();
  }

  const chatTitle = roomInfo?.isGroupChat ? roomInfo?.roomName || '그룹 채팅방' : roomInfo?.participantNicknames?.find(nick => nick !== userInfo?.nickname) || '1:1 대화';

  return (
    <div className="chat-page">
      {/* --- 채팅방 헤더 --- */}
      <div className="chat-header">
        <Link to="/chat" className='back-to-list-link'>←</Link>
        <h2>{chatTitle}</h2>
        <button className="menu-toggle" onClick={() => openModalWithHistory(setShowMenu)}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>☰</button>
      </div>

      {/* --- 참여자 목록: 메뉴에서 '참여자 보기' 클릭 시에만 보임, 방장만 강퇴 가능 --- */}
      {showParticipants && roomInfo?.participantNames?.length > 0 && (
        <div className="participant-list-horizontal" style={{ padding: '8px 12px', background: '#fff', borderBottom: '1px solid #ddd', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          <strong>참여자:</strong>
          {roomInfo.participantNames.map((name, idx) => (
            <span key={idx} style={{ padding: '4px 10px', background: '#f0f0f0', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span onClick={() => handleUserClick(roomInfo.participants?.[idx])}>{name}</span>
              {roomInfo.createdBy === currentUser.uid && roomInfo.participants[idx] !== currentUser.uid && (
                <button
                  style={{ marginLeft: '5px', color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}
                  onClick={() => handleBanUser(roomInfo.participants[idx], name)}
                >강퇴</button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* --- 메뉴(공지, 투표, 참여자 보기, 초대, 나가기, 삭제) --- */}
      {showMenu && (
        <div className="chat-menu-dropdown">
          <button onClick={() => closeModal(setShowMenu)} className="close-menu-btn">×</button>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={menuItemStyle} onClick={() => { openModalWithHistory(setShowNoticeModal); setShowMenu(false); }}>
              <span>📢</span>
              <span>공지 보기</span>
            </li>
            <li style={menuItemStyle} onClick={() => { openModalWithHistory(setShowPollModal); setShowMenu(false); }}>
              <span>🗳️</span>
              <span>투표 보기</span>
            </li>
            <li style={menuItemStyle} onClick={() => { setShowParticipants(p => !p); closeModal(setShowMenu); }}>
              <span>👥</span>
              <span>참여자 보기</span>
            </li>
            <li style={menuItemStyle} onClick={() => { openModalWithHistory(setShowInviteModal); setShowMenu(false); }}>
              <span>➕</span>
              <span>초대하기</span>
            </li>
            <li style={{...menuItemStyle, color: 'red'}} onClick={() => { closeModal(setShowMenu); handleLeaveRoom(); }}>
              <span>🚪</span>
              <span>채팅방 나가기</span>
            </li>
            {roomInfo.createdBy === currentUser.uid && (
              <li style={{ ...menuItemStyle, color: 'red', borderTop: '1px solid #f00' }} onClick={() => { closeModal(setShowMenu); handleDeleteRoom(); }}>
                <span>🗑️</span>
                <span>채팅방 삭제</span>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* --- 채팅 메시지 --- */}
      <div className="chat-box">
        {messages.map(msg => (
          <div key={msg.id} className={`message-wrapper ${msg.uid === currentUser?.uid ? 'sent' : 'received'}`}>
            {msg.uid !== currentUser?.uid && <div className="message-sender">{msg.userName}</div>}
            <div className="message-bubble"><div className="message-text">{msg.text}</div></div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* --- 메시지 입력창 --- */}
      <div className="chat-input-container">
        {showEmojiPicker && <div className="emoji-picker-wrapper"><Picker onSelect={handleEmojiSelect} /></div>}
        <form onSubmit={handleSendMessage} className="message-form">
          <button type="button" className="emoji-button" onClick={() => setShowEmojiPicker(p => !p)}>😀</button>
          <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="메시지를 입력하세요..." />
          <button type="submit">전송</button>
        </form>
      </div>

      {/* --- 사용자 정보 Modal --- */}
      <Modal isOpen={!!selectedUser} onRequestClose={() => closeModal(() => setSelectedUser(null))} style={{ overlay: { backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1010 }, content: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%', maxWidth: '300px', padding: '20px', borderRadius: '10px' } }}>
        {selectedUser && <>
          <h3>{selectedUser.name}</h3>
          <p><strong>닉네임:</strong> {selectedUser.nickname}</p>
          <button onClick={() => closeModal(() => setSelectedUser(null))} style={{ marginTop: '10px', width: '100%', background: '#0d6efd', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>닫기</button>
        </>}
      </Modal>
      
      {/* --- 공지 Modal --- */}
      <Modal isOpen={showNoticeModal} onRequestClose={() => closeModal(setShowNoticeModal)} style={{ overlay: { backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1010 }, content: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%', maxWidth: '400px', padding: '20px', borderRadius: '10px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' } }}>
        <h3 style={{marginTop: 0, flexShrink: 0}}>📢 공지사항</h3>
        <div style={{flexGrow: 1, overflowY: 'auto' }}>
          <ul style={{ paddingLeft: 0, listStyle: 'none', margin: 0 }}>
            {noticeList.map((notice) => (
              <li key={notice.id} style={{ marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                <strong>{notice.title}</strong><br />
                <span style={{ whiteSpace: 'pre-wrap' }}>{notice.content}</span><br />
                <small style={{ color: '#555' }}>작성자: {notice.createdByName}</small>
              </li>
            ))}
          </ul>
          <hr />
          <h4>새 공지 등록</h4>
          <input type="text" placeholder="제목" value={newNotice.title} onChange={(e) => setNewNotice(p => ({ ...p, title: e.target.value }))} style={{ width: '100%', marginBottom: '8px', padding: '8px', boxSizing: 'border-box' }} />
          <textarea placeholder="내용" value={newNotice.content} onChange={(e) => setNewNotice(p => ({ ...p, content: e.target.value }))} rows={3} style={{ width: '100%', marginBottom: '8px', padding: '8px', boxSizing: 'border-box' }} />
          <button onClick={handleAddNotice} style={{ background: '#0d6efd', color: '#fff', padding: '8px 12px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>등록</button>
        </div>
        <button onClick={() => closeModal(setShowNoticeModal)} style={{ marginTop: '15px', background: '#6c757d', color: '#fff', padding: '8px 12px', cursor: 'pointer', border: 'none', borderRadius: '4px', alignSelf: 'flex-end', flexShrink: 0 }}>닫기</button>
      </Modal>

      {/* --- 투표 Modal (날짜 항목 추가 포함) --- */}
      <Modal isOpen={showPollModal} onRequestClose={() => closeModal(setShowPollModal)} style={{ overlay: { backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1010 }, content: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%', maxWidth: '500px', padding: '20px', borderRadius: '10px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' } }}>
        <h3 style={{marginTop: 0, flexShrink: 0}}>🗳 투표</h3>
        <div style={{ flexGrow: 1, overflowY: 'auto' }}>
          <ul style={{ paddingLeft: 0, listStyle: 'none', margin: 0 }}>
            {pollList.map((poll) => {
              const isExpired = poll.deadline && poll.deadline.toDate() < new Date();
              const showResult = !poll.isSecret || isExpired;
              const myVotes = poll.votes?.[currentUser.uid] || [];
              const totalVotes = Object.values(poll.votes || {}).flat().length;
              return (
                <li key={poll.id} style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                  <strong>{poll.title}</strong>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {poll.allowMultiple && <span style={{ background: '#e9ecef', padding: '2px 6px', borderRadius: '4px' }}>중복가능</span>}
                    {poll.isSecret && <span style={{ background: '#e9ecef', padding: '2px 6px', borderRadius: '4px' }}>비밀투표</span>}
                    {poll.isAnonymous && <span style={{ background: '#e9ecef', padding: '2px 6px', borderRadius: '4px' }}>익명투표</span>}
                    {isExpired ? <span style={{ color: 'red' }}> (마감)</span> : poll.deadline && <span> (~{poll.deadline.toDate().toLocaleString()})</span>}
                  </div>
                  <ul style={{ paddingLeft: 0, listStyle: 'none', marginTop: '10px' }}>
                    {poll.options.map((option) => {
                      const voteCount = Object.values(poll.votes || {}).flat().filter(v => v === option).length;
                      const isMyVote = myVotes.includes(option);
                      const votePercentage = totalVotes > 0 ? ((voteCount / totalVotes) * 100).toFixed(1) : 0;
                      return (
                        <li key={option} style={{ fontSize: '14px', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: isMyVote ? 'bold' : 'normal' }}>
                              {isMyVote ? '✔️' : '◻️'} {
                                /^\d{4}-\d{2}-\d{2}/.test(option)
                                  ? new Date(option).toLocaleString()
                                  : option
                              }
                            </span>
                            {showResult && <span>{voteCount}표 ({votePercentage}%)</span>}
                          </div>
                          {showResult && (
                            <div style={{ background: '#f1f3f5', borderRadius: '4px', height: '8px', marginTop: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${votePercentage}%`, height: '100%', background: isMyVote ? '#198754' : '#0d6efd' }}></div>
                            </div>
                          )}
                          {!isExpired && (
                            <button onClick={() => handleVote(poll, option)}
                              style={{ width: '100%', padding: '6px', marginTop: '5px', cursor: 'pointer', background: isMyVote ? '#ffc107' : '#fff', border: '1px solid #ccc' }}>
                              {isMyVote ? '투표 취소' : '투표하기'}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {!showResult && <p style={{ textAlign: 'center', color: '#888', fontSize: '14px' }}>투표가 마감되면 결과를 볼 수 있습니다.</p>}
                  <small style={{ color: '#555', display: 'block', textAlign: 'right', marginTop: '5px' }}>작성자: {poll.isAnonymous ? '익명' : poll.createdByName}</small>
                </li>
              );
            })}
          </ul>
          <hr/>
          {!creatingPoll ? (
            <button onClick={() => setCreatingPoll(true)} style={{ background: '#0d6efd', color: '#fff', padding: '8px 12px', border: 'none', borderRadius: '4px', marginTop: '10px', cursor: 'pointer', width: '100%' }}>➕ 새 투표 만들기</button>
          ) : (
            <div style={{ marginTop: '15px' }}>
              <h4>📝 새 투표 만들기</h4>
              <input type="text" placeholder="투표 제목" value={newPoll.title} onChange={(e) => setNewPoll(p => ({ ...p, title: e.target.value }))} style={{ width: '100%', marginBottom: '10px', padding: '8px', boxSizing: 'border-box' }} />
              <p style={{fontSize: '14px', margin: '0 0 5px 0'}}>항목</p>
              {newPoll.options.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '5px', marginBottom: '6px' }}>
                  <input type="text" placeholder={`항목 ${idx + 1}`} value={opt} onChange={(e) => {
                      const updated = [...newPoll.options]; updated[idx] = e.target.value; setNewPoll(p => ({ ...p, options: updated }));
                    }} style={{ flex: 1, padding: '6px' }} />
                  {newPoll.options.length > 2 && <button onClick={() => setNewPoll(p => ({ ...p, options: p.options.filter((_, i) => i !== idx) }))}>❌</button>}
                </div>
              ))}
              <button onClick={() => setNewPoll(p => ({ ...p, options: [...p.options, ''] }))}>➕ 항목 추가</button>
              <button
                style={{ marginLeft: '8px' }}
                onClick={() => {
                  const date = prompt("날짜를 입력하세요 (예: 2025-06-20 또는 2025-06-20 18:00)");
                  if (date) {
                    setNewPoll(p => ({ ...p, options: [...p.options, date] }));
                  }
                }}
              >
                📅 날짜 항목 추가
              </button>
              <hr style={{margin: '15px 0'}}/>
              <p style={{fontSize: '14px', margin: '0 0 5px 0'}}>옵션</p>
              <div><label><input type="checkbox" checked={newPoll.allowMultiple} onChange={(e) => setNewPoll(p => ({ ...p, allowMultiple: e.target.checked }))} /> 중복 투표 허용</label></div>
              <div><label><input type="checkbox" checked={newPoll.isSecret} onChange={(e) => setNewPoll(p => ({ ...p, isSecret: e.target.checked }))} /> 마감 전까지 결과 비공개</label></div>
              <div><label><input type="checkbox" checked={newPoll.isAnonymous} onChange={(e) => setNewPoll(p => ({ ...p, isAnonymous: e.target.checked }))} /> 익명 투표</label></div>
              <div style={{marginTop: '10px'}}><label>마감일 설정 (선택): <input type="datetime-local" value={newPoll.deadline} onChange={(e) => setNewPoll(p => ({ ...p, deadline: e.target.value }))} /></label></div>
              <div style={{marginTop: '20px', textAlign: 'center'}}>
                <button onClick={handleCreatePoll} style={{ background: '#198754', color: '#fff', padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📨 투표 등록</button>
                <button onClick={() => { setCreatingPoll(false); setNewPoll({ title: '', options: ['', ''], deadline: '', allowMultiple: false, isSecret: false, isAnonymous: false }); }} style={{ marginLeft: '8px', background: '#6c757d', color: '#fff', padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>취소</button>
              </div>
            </div>
          )}
        </div>
        <button onClick={() => closeModal(setShowPollModal)} style={{ marginTop: '15px', background: '#6c757d', color: '#fff', padding: '8px 12px', cursor: 'pointer', border: 'none', borderRadius: '4px', alignSelf: 'flex-end', flexShrink: 0 }}>닫기</button>
      </Modal>

      {/* --- 초대 Modal --- */}
      <Modal isOpen={showInviteModal} onRequestClose={() => closeModal(setShowInviteModal)} style={{ overlay: { backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1010 }, content: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%', maxWidth: '420px', padding: '20px', borderRadius: '10px' } }}>
        <h3>➕ 참여자 초대</h3>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
          <button onClick={() => setInviteTab('search')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '4px', background: inviteTab === 'search' ? '#0d6efd' : '#eee', color: inviteTab === 'search' ? '#fff' : '#000', cursor: 'pointer' }}>🔍 사용자 검색</button>
          <button onClick={() => setInviteTab('link')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '4px', background: inviteTab === 'link' ? '#0d6efd' : '#eee', color: inviteTab === 'link' ? '#fff' : '#000', cursor: 'pointer' }}>🔗 링크 초대</button>
        </div>
        {inviteTab === 'search' && (
          <div>
            <div style={{ display: 'flex', gap: '5px' }}>
              <input placeholder="닉네임 검색" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ flex: 1, marginBottom: '10px', padding: '8px' }} />
              <button onClick={handleSearchUsers} style={{ marginBottom: '10px', padding: '8px', cursor: 'pointer' }}>🔍</button>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, maxHeight: '150px', overflowY: 'auto' }}>
              {searchResults.map(user => (
                <li key={user.uid} style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{user.name} ({user.nickname})</span>
                  <button onClick={() => handleInviteUser(user.uid, user.nickname)} style={{ marginLeft: '10px', cursor: 'pointer' }}>초대</button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {inviteTab === 'link' && (
          <div>
            <p>아래 링크를 복사하거나 공유하세요:</p>
            <input type="text" value={`${window.location.origin}/chat/invite/${roomId}`} readOnly style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/chat/invite/${roomId}`); alert('링크가 복사되었습니다!'); }} style={{ marginTop: '8px', cursor: 'pointer' }}>📋 복사</button>
          </div>
        )}
        <button onClick={() => closeModal(setShowInviteModal)} style={{ marginTop: '20px', padding: '8px 12px', background: '#6c757d', color: '#fff', cursor: 'pointer', border: 'none', borderRadius: '4px' }}>닫기</button>
      </Modal>
    </div>
  );
};

// 접근 차단 화면을 위한 재사용 컴포넌트
const BlockedScreen = ({ message }) => (
  <div className="unauthorized-screen" style={{ textAlign: 'center', padding: '50px', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
    <h3>🚫 접근 불가</h3>
    <p>{message}</p>
    <br />
    <Link to="/chat" style={{ padding: '10px 16px', background: '#0d6efd', color: '#fff', textDecoration: 'none', borderRadius: '6px' }}>채팅 목록으로 돌아가기</Link>
  </div>
);

export default ChatRoomPage;