import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import {
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp,
  doc, updateDoc, getDoc, getDocs, where, setDoc, deleteDoc, Timestamp
} from 'firebase/firestore';
import { Picker } from 'emoji-mart';
import Modal from 'react-modal';
import ImageUploader from '../components/ImageUploader';

Modal.setAppElement('#root');

function groupMessagesByDate(messages) {
  return messages.reduce((acc, msg) => {
    const dateObj = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt);
    const dateStr = dateObj.toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    });
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(msg);
    return acc;
  }, {});
}

function getHighlightedText(text, highlight) {
  if (!highlight.trim()) return text;
  const regex = new RegExp(`(${highlight})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.filter(Boolean).map((part, i) =>
        regex.test(part) ? <mark key={i}>{part}</mark> : part
      )}
    </>
  );
}

const ChatRoomPage = ({ userInfo }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [roomInfo, setRoomInfo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeList, setNoticeList] = useState([]);
  const [newNotice, setNewNotice] = useState({ title: '', content: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]); // Cloudinary 업로드 완료된 파일 배열
  const [uploading, setUploading] = useState(false); // 업로드 중 표시
  const [uploadError, setUploadError] = useState(''); // 업로드 에러 메시지
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const handleFileChange = async (e) => {
  const filesArray = Array.from(e.target.files);
  if (filesArray.length === 0) return;
  setUploading(true);
  setUploadError('');
  const uploadedFiles = [];
  try {
    for (const file of filesArray) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "yeongjung_preset"); // Cloudinary preset
      const res = await fetch("https://api.cloudinary.com/v1_1/dqrcyclit/auto/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.secure_url) {
        uploadedFiles.push({
          url: data.secure_url,
          originalName: file.name,
          type: file.type,
          size: file.size,
        });
      } else {
        throw new Error(data.error?.message || "Cloudinary 업로드 실패");
      }
    }
    setFiles(uploadedFiles);
  } catch (err) {
    setUploadError("파일 업로드 중 오류가 발생했습니다: " + err.message);
    setFiles([]);
  } finally {
    setUploading(false);
  }
};
  const messagesEndRef = useRef(null);
  const filteredMessages = messages.filter(msg =>
  (msg.text && msg.text.toLowerCase().includes(searchTerm.toLowerCase())) ||
  (msg.type === "notice" && msg.notice?.title?.toLowerCase().includes(searchTerm.toLowerCase())) ||
  (msg.type === "poll" && msg.poll?.title?.toLowerCase().includes(searchTerm.toLowerCase())) ||
  (Array.isArray(msg.files) && msg.files.length > 0) // 파일만 있는 경우도 포함
);
  const currentUser = auth.currentUser;
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollList, setPollList] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [inviteTab, setInviteTab] = useState('search');
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  const [showParticipants, setShowParticipants] = useState(false);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [noticeFiles, setNoticeFiles] = useState([]);
  const [noticeUploading, setNoticeUploading] = useState(false);
  const [noticeUploadError, setNoticeUploadError] = useState('');
  const handleNoticeFileChange = async (e) => {
  const filesArray = Array.from(e.target.files);
  if (filesArray.length === 0) return;
  setNoticeUploading(true);
  setNoticeUploadError('');
  const uploadedFiles = [];
  try {
    for (const file of filesArray) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "yeongjung_preset");
      const res = await fetch("https://api.cloudinary.com/v1_1/dqrcyclit/auto/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.secure_url) {
        uploadedFiles.push({
          url: data.secure_url,
          originalName: file.name,
          type: file.type,
          size: file.size,
        });
      } else {
        throw new Error(data.error?.message || "Cloudinary 업로드 실패");
      }
    }
    setNoticeFiles(uploadedFiles);
  } catch (err) {
    setNoticeUploadError("파일 업로드 중 오류가 발생했습니다: " + err.message);
    setNoticeFiles([]);
  } finally {
    setNoticeUploading(false);
  }
};
  const [newPoll, setNewPoll] = useState({
    title: '',
    options: ['', ''],
    deadline: '',
    allowMultiple: false,
    isSecret: false,
    isAnonymous: false,
  });

  const handleImageClick = (url) => {
  setSelectedImageUrl(url);
  setShowImageModal(true);
};

  const menuItemStyle = {
    padding: '8px',
    cursor: 'pointer',
    borderBottom: '1px solid #eee',
    fontSize: '14px'
  };

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
    }, (error) => {
      console.error("채팅방 정보 구독 오류:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    const handleFocus = () => {
      if (!roomId || !currentUser?.uid || !roomInfo?.participants?.includes(currentUser.uid)) return;
      updateDoc(doc(db, "chatRooms", roomId), {
        [`lastRead.${currentUser.uid}`]: new Date()
      }).catch((error) => console.error("lastRead 업데이트 오류:", error));
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [roomId, currentUser, roomInfo]);

  useEffect(() => {
  if (!roomId) return;
  const q = query(collection(db, "chatRooms", roomId, "messages"), orderBy("createdAt"));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const newMessages = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    // ⭐ files가 undefined인 메시지는 files: []로 보정
    const safeMessages = newMessages.map(msg => ({
      ...msg,
      files: Array.isArray(msg.files) ? msg.files : [],
    }));
    console.log("Firestore에서 받아온 새 메시지들(safe):", safeMessages); // 디버깅용
    setMessages(safeMessages);
  }, (error) => console.error("메시지 구독 오류:", error));
  return () => unsubscribe();
}, [roomId, notificationPermission, roomInfo, currentUser]);

  useEffect(() => {
    if (!roomId) return;
    const q = query(collection(db, "chatRooms", roomId, "announcements"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => setNoticeList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))), (error) => console.error("공지 구독 오류:", error));
    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    const q = query(collection(db, "chatRooms", roomId, "polls"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => setPollList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))), (error) => console.error("투표 구독 오류:", error));
    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!roomId || !currentUser || !db) return;
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
        setRoomInfo(data);
        await updateDoc(roomRef, {
          [`lastRead.${currentUser.uid}`]: new Date()
        });
      } catch (error) {
        console.error("채팅방 정보 불러오기 실패:", error);
        alert("채팅방 입장 중 오류가 발생했습니다.");
        navigate('/chat');
      }
    };
    fetchRoomInfo();
  }, [roomId, currentUser, navigate, db, setRoomInfo]);

  useEffect(() => {
    if (!('Notification' in window)) {
      console.warn('이 브라우저는 알림을 지원하지 않습니다.');
      return;
    }
    if (Notification.permission !== 'granted') {
      Notification.requestPermission().then(permission => {
        setNotificationPermission(permission);
      });
    }
    const handlePopState = () => {
      if (window.history.state?.modal !== 'open') {
        setShowMenu(false);
        setShowNoticeModal(false);
        setShowPollModal(false);
        setShowInviteModal(false);
        setSelectedUser(null);
        setShowParticipants(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const closeModal = (setFunction) => {
    setFunction(false);
    if (window.history.state?.modal === 'open') {
      window.history.back();
    }
  };
  const openModalWithHistory = (setFunction) => {
    window.history.pushState({ modal: 'open' }, '', window.location.href);
    setFunction(true);
  };

  const handleEmojiSelect = (emoji) => {
    setNewMessage(prev => prev + emoji.native);
  };

const handleSendMessage = async (e) => {
  e.preventDefault();
  if ((!newMessage.trim() && files.length === 0) || uploading) {
    alert("메시지나 파일/이미지를 입력하세요.");
    return;
  }
  try {
    const messageData = {
      text: newMessage || "",
      files,
      createdAt: serverTimestamp(),
      uid: currentUser.uid,
      userName: userInfo.nickname
    };
    const docRef = await addDoc(collection(db, "chatRooms", roomId, "messages"), messageData);
    console.log("저장된 메시지 데이터:", { id: docRef.id, ...messageData });
    setNewMessage('');
    setFiles([]);
  } catch (err) {
    alert("채팅 메시지 전송 중 오류가 발생했습니다.");
    console.error("채팅 오류:", err);
  }
};

  const handleUserClick = async (uid) => {
    try {
      const docSnap = await getDoc(doc(db, "users", uid));
      if (docSnap.exists()) {
        openModalWithHistory(() => setSelectedUser(docSnap.data()));
      }
    } catch (error) { console.error("사용자 정보 오류:", error); }
  };

  const handleBanUser = async (banUid, banName) => {
    if (roomInfo.createdBy !== currentUser.uid) {
      alert("강퇴 권한이 없습니다. 방장만 강퇴할 수 있습니다.");
      return;
    }
    if (!window.confirm(`${banName}님을 강퇴하시겠습니까?`)) return;
    const roomRef = doc(db, "chatRooms", roomId);
    try {
      const index = roomInfo.participants.indexOf(banUid);
      if (index === -1) {
        alert("사용자를 찾을 수 없습니다.");
        return;
      }
      await updateDoc(roomRef, {
        [`bannedUsers.${banUid}`]: { bannedAt: serverTimestamp(), bannedBy: currentUser.uid },
        participants: roomInfo.participants.filter(uid => uid !== banUid),
        participantNames: roomInfo.participantNames.filter((_, i) => i !== index),
        participantNicknames: roomInfo.participantNicknames.filter((_, i) => i !== index),
      });
      alert(`${banName}님을 강퇴했습니다.`);
    } catch (error) {
      console.error("강퇴 오류:", error);
      alert("강퇴 중 오류가 발생했습니다.");
    }
  };

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
    } catch (error) { console.error("채팅방 나가기 오류:", error); alert("채팅방 나가기 중 오류가 발생했습니다."); }
  };

  // 추가: 채팅방 삭제 함수
  const handleDeleteRoom = async () => {
    if (!roomInfo || roomInfo.createdBy !== currentUser.uid) {
      alert("채팅방 삭제 권한이 없습니다");
      return;
    }
    if (window.confirm(`'${roomInfo.roomName}' 채팅방을 정말 삭제하시겠습니까?`)) {
      try {
        await deleteDoc(doc(db, "chatRooms", roomId));
        alert("채팅방이 삭제되었습니다");
        navigate("/chat");
      } catch (error) {
        console.error("채팅방 삭제 오류:", error);
        alert("채팅방 삭제 중 오류가 발생했습니다");
      }
    }
  };

  const handleAddNotice = async () => {
    if (!newNotice.title.trim() || !newNotice.content.trim()) return alert("공지 제목과 내용을 입력해주세요.");
    try {
      const noticeDoc = await addDoc(
        collection(db, "chatRooms", roomId, "announcements"),
        {
          ...newNotice,
          files: noticeFiles,
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid,
          createdByName: userInfo.nickname
        }
      );
      await addDoc(collection(db, "chatRooms", roomId, "messages"), {
        type: "notice",
        content: `[공지] ${newNotice.title}`,
        notice: {
          id: noticeDoc.id,
          title: newNotice.title,
          content: newNotice.content,
          createdBy: currentUser.uid,
          createdByName: userInfo.nickname
        },
        createdAt: serverTimestamp(),
        senderId: "system"
      });
      setNewNotice({ title: '', content: '' });
      alert("공지 등록이 완료되었습니다.");
    } catch (error) {
      console.error("공지 등록 오류:", error);
      alert("공지 등록 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteNotice = async (noticeId, messageId) => {
    if (!window.confirm("정말로 이 공지를 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, "chatRooms", roomId, "announcements", noticeId));
      if (messageId) {
        await deleteDoc(doc(db, "chatRooms", roomId, "messages", messageId));
      }
      alert("공지 삭제가 완료되었습니다.");
    } catch (error) {
      console.error("공지 삭제 오류:", error);
      alert("공지 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleCreatePoll = async () => {
    const trimmedOptions = newPoll.options.map(opt => opt.trim()).filter(Boolean);
    if (!newPoll.title.trim() || trimmedOptions.length < 2) return alert("투표 제목과 최소 2개의 항목을 입력해주세요.");
    try {
      const pollDoc = await addDoc(collection(db, "chatRooms", roomId, "polls"), {
        title: newPoll.title, options: trimmedOptions, deadline: newPoll.deadline ? Timestamp.fromDate(new Date(newPoll.deadline)) : null,
        allowMultiple: newPoll.allowMultiple, isSecret: newPoll.isSecret, isAnonymous: newPoll.isAnonymous,
        votes: {}, createdAt: serverTimestamp(), createdBy: currentUser.uid, createdByName: userInfo.nickname
      });
      await addDoc(collection(db, "chatRooms", roomId, "messages"), {
        type: "poll",
        content: `[투표] ${newPoll.title}`,
        poll: {
          id: pollDoc.id,
          title: newPoll.title,
          options: trimmedOptions,
          deadline: newPoll.deadline,
          createdBy: currentUser.uid,
          createdByName: userInfo.nickname
        },
        createdAt: serverTimestamp(),
        senderId: "system"
      });
      setNewPoll({ title: '', options: ['', ''], deadline: '', allowMultiple: false, isSecret: false, isAnonymous: false });
      setCreatingPoll(false);
      alert("투표가 등록되었습니다!");
    } catch (error) {
      console.error("투표 생성 오류:", error);
      alert("투표 등록 중 오류가 발생했습니다.");
    }
  };

  const handleDeletePoll = async (pollId, pollMessageId) => {
    try {
      await deleteDoc(doc(db, "chatRooms", roomId, "polls", pollId));
      if (pollMessageId) {
        await deleteDoc(doc(db, "chatRooms", roomId, "messages", pollMessageId));
      }
      alert("투표가 삭제되었습니다.");
    } catch (error) {
      alert("투표 삭제 중 오류가 발생했습니다.");
      console.error(error);
    }
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
    await updateDoc(pollRef, { [`votes.${currentUser.uid}`]: newVotes }).catch(error => {
      console.error("투표하기 오류: ", error);
      alert("투표 중 오류가 발생했습니다.");
    });
    alert("투표가 반영되었습니다.");
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return;
    const q = query(collection(db, "users"),
      where("nickname", ">=", searchQuery),
      where("nickname", "<=", searchQuery + '\uf8ff'));
    const snapshot = await getDocs(q);
    setSearchResults(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }))
      .filter(user => user.uid !== currentUser.uid));
  };

  const handleInviteUser = async (uid, nickname) => {
    if (!roomInfo || !roomId) return;
    const invitationRef = doc(db, "chatRooms", roomId, "invitations", uid);
    try {
      await setDoc(invitationRef, {
        uid,
        nickname,
        invitedBy: currentUser.uid,
        invitedByName: userInfo.nickname,
        createdAt: serverTimestamp()
      });
      alert(`${nickname}님에게 초대장을 보냈습니다.`);
    } catch (error) {
      console.error("초대 오류:", error);
      alert("초대 중 오류가 발생했습니다.");
    }
  };

  // 메시지 그룹화 변수 정의 (오류 해결)
  const groupedMessages = groupMessagesByDate(filteredMessages);
  const chatTitle = roomInfo?.isGroupChat ? roomInfo?.roomName || '그룹 채팅방' : roomInfo?.participantNicknames?.find(nick => nick !== userInfo?.nickname) || '1:1 대화';

  return (
    <div className="chat-page">
      {/* --- 채팅방 헤더 --- */}
      <div className="chat-header">
        <Link to="/chat" className='back-to-list-link' aria-label="채팅 목록으로 돌아가기">←</Link>
        <h2>{chatTitle}</h2>
        <button className="menu-toggle" onClick={() => openModalWithHistory(setShowMenu)}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }} aria-label="채팅방 메뉴 열기">☰</button>
      </div>

      {/* --- 메뉴(공지, 투표, 참여자 보기, 초대, 나가기, 삭제) --- */}
      {showMenu && (
        <div className="chat-menu-dropdown">
          <button onClick={() => closeModal(setShowMenu)} className="close-menu-btn" aria-label="메뉴 닫기">×</button>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={menuItemStyle} onClick={() => { openModalWithHistory(setShowNoticeModal); setShowMenu(false); }}>
              <span>📢</span>
              <span>공지 보기</span>
              <div className="help-text" style={{ fontSize: '13px', color: '#888' }}>채팅방의 공지사항을 확인하고 새 공지를 등록할 수 있습니다.</div>
            </li>
            <li style={menuItemStyle} onClick={() => { openModalWithHistory(setShowPollModal); setShowMenu(false); }}>
              <span>🗳️</span>
              <span>투표 보기</span>
              <div className="help-text" style={{ fontSize: '13px', color: '#888' }}>채팅방 내 투표를 확인하고 참여할 수 있습니다.</div>
            </li>
            <li style={menuItemStyle} onClick={() => setShowParticipants(true)} aria-label="채팅방 참여자 목록 열기" title="채팅방에 참여 중인 사람을 확인할 수 있습니다.">
              <span role="img" aria-label="참여자">👥</span>
              참여자 보기
              <div className="help-text" style={{ fontSize: '13px', color: '#888' }}>채팅방에 함께 참여 중인 사람들입니다.</div>
            </li>
            <li style={menuItemStyle} onClick={() => { openModalWithHistory(setShowInviteModal); setShowMenu(false); }}>
              <span>➕</span>
              <span>초대하기</span>
              <div className="help-text" style={{ fontSize: '13px', color: '#888' }}>다른 사용자를 채팅방에 초대할 수 있습니다.</div>
            </li>
            <li style={{...menuItemStyle, color: 'red'}} onClick={() => { closeModal(setShowMenu); handleLeaveRoom(); }}>
              <span>🚪</span>
              <span>채팅방 나가기</span>
              <div className="help-text" style={{ fontSize: '13px', color: '#888' }}>채팅방에서 나가면 다시 초대를 받아야 입장할 수 있습니다.</div>
            </li>
            {roomInfo.createdBy === currentUser.uid && (
              <li style={{ ...menuItemStyle, color: 'red', borderTop: '1px solid #f00' }} onClick={() => { closeModal(setShowMenu); handleDeleteRoom(); }}>
                <span>🗑️</span>
                <span>채팅방 삭제</span>
                <div className="help-text" style={{ fontSize: '13px', color: '#888' }}>채팅방을 완전히 삭제합니다. 되돌릴 수 없습니다.</div>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* --- 참여자 목록: 카카오톡처럼 하단 모달/슬라이드로 오버레이 --- */}
      <Modal
        isOpen={showParticipants}
        onRequestClose={() => setShowParticipants(false)}
        shouldCloseOnOverlayClick={true}
        shouldCloseOnEsc={true}
        aria={{ labelledby: "participantsTitle" }}
        contentLabel="참여자 목록"
        style={{
          overlay: {
            backgroundColor: 'rgba(0,0,0,0.15)',
            zIndex: 1100
          },
          content: {
            top: '70px',
            right: '0px',
            left: 'auto',
            bottom: 'auto',
            width: '320px',
            height: 'calc(100vh - 90px)',
            borderRadius: '16px 0 0 16px',
            padding: '24px 18px 18px 18px',
            boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
            overflow: 'auto',
            margin: 0,
            position: 'fixed',
            background: '#fff',
            zIndex: 1200
          }
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <strong id="participantsTitle" style={{ fontSize: '16px' }}>참여자 목록</strong>
          <button
            onClick={() => setShowParticipants(false)}
            style={{
              fontSize: '20px',
              background: 'none',
              border: 'none',
              color: '#000',
              cursor: 'pointer',
              zIndex: 1300
            }}
            aria-label="참여자 목록 닫기"
            title="참여자 목록 닫기"
            tabIndex={0}
          >
            ×
          </button>
        </div>
        <div style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>
          채팅방에 함께 참여 중인 사람들입니다.
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
  {roomInfo && roomInfo.participants
    ? `${roomInfo.participants.length} / ${roomInfo.maxParticipants || '무제한'}명 참여중`
    : '로딩 중...'}
</div>
        <div style={{ maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {roomInfo && roomInfo.participantNames && roomInfo.participantNames.map((name, idx) => (
            <span key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#fffbe6',
              borderRadius: '20px',
              padding: '6px 12px',
              fontSize: '15px',
              fontWeight: 500
            }}>
              <span style={{
                background: '#ffeb3b',
                borderRadius: '50%',
                width: '26px',
                height: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '14px'
              }}>
                {name.slice(0, 2)}
              </span>
              <span style={{ wordBreak: 'break-all' }}>{name} ({roomInfo.participantNicknames?.[idx] || '닉네임 없음'})</span>
              {roomInfo.createdBy === currentUser.uid && roomInfo.participants[idx] !== currentUser.uid && (
                <button
                  style={{
                    marginLeft: '6px',
                    color: '#fff',
                    background: '#dc3545',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '2px 10px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleBanUser(roomInfo.participants[idx], name)}
                  aria-label={`${name} 강퇴`}
                  type="button"
                >강퇴</button>
              )}
            </span>
          ))}
        </div>
      </Modal>

      <div style={{ margin: '12px 0' }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="채팅 내용 검색..."
          aria-label="채팅 검색창"
          style={{
            width: '100%',
            padding: '8px',
            fontSize: '1rem',
            border: '1px solid #ccc',
            borderRadius: '6px'
          }}
        />
      </div>

      {/* --- 채팅 메시지 --- */}
<div className="chat-box" style={{ padding: '12px', overflowY: 'auto', maxHeight: '70vh' }}>
  {Object.entries(groupedMessages).map(([date, msgs]) => (
    <div key={date}>
      <div className="chat-date-divider">{date}</div>
      {msgs.map((msg, index) => {
        const isMine = msg.uid === currentUser?.uid;
        const prevMsg = index > 0 ? msgs[index - 1] : null;
        const showTime = !prevMsg || prevMsg.createdAt?.toDate().toLocaleDateString() !== msg.createdAt?.toDate().toLocaleDateString() || prevMsg.uid !== msg.uid;
        const timeStr = msg.createdAt?.toDate
          ? msg.createdAt.toDate().toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            }).replace('오전', '오전 ').replace('오후', '오후 ')
          : '시간 없음';
        return (
          <div key={msg.id} className={`message-wrapper ${isMine ? 'sent' : 'received'}`}>
            {msg.uid !== currentUser?.uid && <div className="message-sender">{msg.userName}</div>}
            <div className="message-bubble"
              style={{
                padding: '12px 16px',
                borderRadius: 14,
                background: '#f7f7f7',
                display: 'block',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                marginBottom: 8,
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}>
              {(msg.text && msg.text.trim()) && (
                <div className="message-text" style={{ marginBottom: Array.isArray(msg.files) && msg.files.length > 0 ? 8 : 0 }}>
                  {getHighlightedText(msg.text, searchTerm)}
                </div>
              )}
              {Array.isArray(msg.files) && msg.files.length > 0 && (
                <div style={{ marginTop: (msg.text && msg.text.trim()) ? 8 : 2 }}>
                  <ul style={{ display: 'flex', gap: 8, listStyle: 'none', padding: 0, margin: 0 }}>
                    {msg.files.map((file, idx) => (
                      <li key={idx}>
                        {file.type && file.type.startsWith('image/') ? (
                          <img
                            src={file.url}
                            alt={file.originalName}
                            style={{
                              maxWidth: '100px',
                              maxHeight: '100px',
                              objectFit: 'contain',
                              borderRadius: 4,
                              marginRight: 4,
                              cursor: 'pointer',
                            }}
                            onClick={() => handleImageClick(file.url)}
                          />
                        ) : (
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: '#1976d2',
                              textDecoration: 'underline',
                              fontWeight: 'bold',
                              fontSize: 18,
                              wordBreak: 'break-all',
                              display: 'inline-block',
                              padding: '14px 18px',
                              background: '#fffbe6',
                              borderRadius: 10,
                              margin: '12px 0',
                              border: '2px solid #1976d2',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                            }}
                          >
                            📄 {file.originalName}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(!msg.text || !msg.text.trim()) && (!Array.isArray(msg.files) || msg.files.length === 0) && (
                <div style={{ color: '#aaa', fontSize: 13 }}>삭제된 메시지입니다.</div>
              )}
              {msg.uid === currentUser?.uid && (
                <button
                  style={{
                    marginTop: 8,
                    background: '#dc3545',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    cursor: 'pointer',
                    fontSize: 13
                  }}
                  onClick={async () => {
                    if (window.confirm("정말 삭제하시겠습니까?")) {
                      try {
                        await deleteDoc(doc(db, "chatRooms", roomId, "messages", msg.id));
                        alert("메시지가 삭제되었습니다.");
                      } catch (err) {
                        alert("삭제 중 오류가 발생했습니다.");
                        console.error(err);
                      }
                    }
                  }}
                >
                  삭제
                </button>
              )}
              {showTime && (
                <div style={{ fontSize: '12px', color: '#888', textAlign: isMine ? 'right' : 'left', marginTop: 4 }}>
                  {timeStr}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  ))}
  <div ref={messagesEndRef} />
</div>

      {/* 이미지 모달 (기존 코드 유지) */}
      <Modal
        isOpen={showImageModal}
        onRequestClose={() => setShowImageModal(false)}
        style={{
          overlay: {
            backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 2000,
          },
          content: {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%', // 모바일에서 90%로 유연하게
    maxWidth: '500px', // 데스크톱 최대값 유지
    maxHeight: '90vh',
    padding: '0',
    border: 'none',
    background: 'transparent',
    overflow: 'auto', // 스크롤 가능하게
  },
}}
      >
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <img
  src={selectedImageUrl}
  alt="Enlarged view"
  style={{
    width: '100%',
    height: 'auto',
    maxHeight: '90vh', // 약간 더 넓게 설정
    objectFit: 'contain',
    display: 'block', // 중앙 정렬을 위한 설정
    margin: '0 auto', // 중앙 정렬
  }}
/>
          <button
            onClick={() => setShowImageModal(false)}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: '#dc3545',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              fontSize: '18px',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
      </Modal>

{/* --- 메시지 입력창 --- */}
<div className="chat-input-container">
  <form onSubmit={handleSendMessage} className="message-form" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
    <label htmlFor="chat-file-upload" style={{ cursor: 'pointer', marginRight: 8, fontSize: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
      <span role="img" aria-label="파일">📎</span>
      <span style={{ fontSize: 14, color: '#555' }}>파일 첨부</span>
      <input
        id="chat-file-upload"
        type="file"
        multiple
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </label>
    <input
      type="text"
      value={newMessage}
      onChange={e => setNewMessage(e.target.value)}
      placeholder="메시지를 입력하세요... (예: 안녕하세요!)"
      aria-label="메시지 입력"
      style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
    />
    <button
  type="submit"
  aria-label="메시지 전송"
  disabled={uploading || (!newMessage.trim() && files.length === 0)}
  style={{
    background: '#0d6efd',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '6px 16px',
    fontWeight: 600,
    opacity: (uploading || (!newMessage.trim() && files.length === 0)) ? 0.5 : 1,
    cursor: (uploading || (!newMessage.trim() && files.length === 0)) ? 'not-allowed' : 'pointer'
  }}
>
  전송
</button>
  </form>
  {/* 업로드 중/에러 표시 */}
  {uploading && (
    <div style={{ color: "#1976d2", fontSize: 14, marginTop: 4 }}>파일 업로드 중...</div>
  )}
  {uploadError && (
    <div style={{ color: "red", fontSize: 14, marginTop: 4 }}>{uploadError}</div>
  )}
  {/* 파일 미리보기/파일명 */}
  {files.length > 0 && (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
      {files.map((file, idx) =>
        file.type.startsWith('image/') ? (
          <img key={idx} src={file.url} alt={file.originalName} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />
        ) : (
          <span key={idx} style={{ fontSize: 13, background: '#eee', borderRadius: 4, padding: '2px 6px' }}>{file.originalName}</span>
        )
      )}
        <button type="button" onClick={() => setFiles([])} style={{ marginLeft: 4, color: 'red', border: 'none', background: 'transparent', cursor: 'pointer' }}>x</button>
        <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>첨부파일은 10MB 이하, 최대 3개까지 가능합니다.</span>
      </div>
    )}
    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
      이미지는 jpg, png, gif, pdf만 첨부 가능 (최대 3개, 10MB 이하)
    </div>
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
<Modal
  isOpen={showNoticeModal}
  onRequestClose={() => closeModal(setShowNoticeModal)}
  style={{
    overlay: { backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1010 },
    content: {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '90%',
      maxWidth: '400px',
      padding: '20px',
      borderRadius: '10px',
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column'
    }
  }}
>
  <h3 style={{ marginTop: 0, flexShrink: 0 }}>📢 공지사항</h3>
  <div style={{ flexGrow: 1, overflowY: 'auto' }}>
    {/* --- 공지 리스트 --- */}
    <ul style={{ paddingLeft: 0, listStyle: 'none', margin: 0 }}>
      {noticeList.map((notice) => (
        <li
          key={notice.id}
          style={{
            marginBottom: '10px',
            borderBottom: '1px solid #eee',
            paddingBottom: '10px'
          }}
        >
          <strong>{notice.title}</strong>
          <br />
          <span style={{ whiteSpace: 'pre-wrap' }}>{notice.content}</span>
          <br />
          {/* 파일/이미지 미리보기 */}
          {Array.isArray(notice.files) && notice.files.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <ul style={{ display: 'flex', gap: 6, listStyle: 'none', padding: 0 }}>
                {notice.files.map((file, idx) => (
                  <li key={idx}>
                    {file.type && file.type.startsWith('image/') ? (
                      <img
                        src={file.url}
                        alt={file.originalName}
                        style={{
                          width: 40,
                          height: 40,
                          objectFit: 'cover',
                          borderRadius: 4,
                          marginRight: 4
                        }}
                      />
                    ) : (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#1976d2', textDecoration: 'underline' }}
                      >
                        {file.originalName}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <small style={{ color: '#555' }}>작성자: {notice.createdByName}</small>
          {/* (공지 삭제 버튼 등 추가 가능) */}
          {notice.createdBy === currentUser.uid && (
            <button
              style={{
                marginTop: 6,
                background: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                cursor: 'pointer'
              }}
              onClick={() => handleDeleteNotice(notice.id, messages.find(m => m.type === "notice" && m.notice?.id === notice.id)?.id)}
            >
              공지 삭제
            </button>
          )}
        </li>
      ))}
    </ul>
    <hr />
    {/* --- 새 공지 등록 폼 --- */}
    <h4>새 공지 등록</h4>
    <input
      type="text"
      placeholder="제목 (예: 6월 모임 안내)"
      value={newNotice.title}
      onChange={e => setNewNotice(p => ({ ...p, title: e.target.value }))}
      style={{
        width: '100%',
        marginBottom: '8px',
        padding: '8px',
        boxSizing: 'border-box'
      }}
      aria-label="공지 제목 입력"
    />
    <textarea
      placeholder="내용 (예: 6월 모임은 6/25 15시에 진행됩니다.)"
      value={newNotice.content}
      onChange={e => setNewNotice(p => ({ ...p, content: e.target.value }))}
      rows={3}
      style={{
        width: '100%',
        marginBottom: '8px',
        padding: '8px',
        boxSizing: 'border-box'
      }}
      aria-label="공지 내용 입력"
    />
    {/* 파일 첨부 UI */}
    <label
      htmlFor="notice-file-upload"
      style={{
        cursor: 'pointer',
        marginRight: 8,
        fontSize: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 4
      }}
    >
      <span role="img" aria-label="파일">📎</span>
      <span style={{ fontSize: 14, color: '#555' }}>파일 첨부</span>
      <input
        id="notice-file-upload"
        type="file"
        multiple
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
        onChange={handleNoticeFileChange}
      />
    </label>
    {noticeUploading && (
      <div style={{ color: "#1976d2", fontSize: 14, marginTop: 4 }}>
        파일 업로드 중...
      </div>
    )}
    {noticeUploadError && (
      <div style={{ color: "red", fontSize: 14, marginTop: 4 }}>
        {noticeUploadError}
      </div>
    )}
    {noticeFiles.length > 0 && (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
        {noticeFiles.map((file, idx) =>
          file.type.startsWith('image/') ? (
            <img
              key={idx}
              src={file.url}
              alt={file.originalName}
              style={{
                width: 32,
                height: 32,
                objectFit: 'cover',
                borderRadius: 4
              }}
            />
          ) : (
            <span
              key={idx}
              style={{
                fontSize: 13,
                background: '#eee',
                borderRadius: 4,
                padding: '2px 6px'
              }}
            >
              {file.originalName}
            </span>
          )
        )}
        <button
          type="button"
          onClick={() => setNoticeFiles([])}
          style={{
            marginLeft: 4,
            color: 'red',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          x
        </button>
        <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>
          첨부파일은 10MB 이하, 최대 3개까지 가능합니다.
        </span>
      </div>
    )}
    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
      이미지는 jpg, png, gif, pdf만 첨부 가능 (최대 3개, 10MB 이하)
    </div>
    <button
      onClick={handleAddNotice}
      style={{
        background: '#0d6efd',
        color: '#fff',
        padding: '8px 12px',
        border: 'none',
        cursor: 'pointer',
        borderRadius: '4px'
      }}
    >
      등록
    </button>
  </div>
  <button
    onClick={() => closeModal(setShowNoticeModal)}
    style={{
      marginTop: '15px',
      background: '#6c757d',
      color: '#fff',
      padding: '8px 12px',
      cursor: 'pointer',
      border: 'none',
      borderRadius: '4px',
      alignSelf: 'flex-end',
      flexShrink: 0
    }}
  >
    닫기
  </button>
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
                  {/* 투표 삭제 버튼 */}
                  {poll.createdBy === currentUser.uid && (
  <button
    onClick={() => {
      const pollMsg = messages.find(m => m.type === "poll" && m.poll?.id === poll.id);
      if (pollMsg) {
        handleDeletePoll(poll.id, pollMsg.id);
      } else {
        alert("채팅 메시지에서 해당 투표 메시지를 찾을 수 없습니다.");
      }
    }}>
    투표 삭제
  </button>
)}
                </li>
              );
            })}
          </ul>
          <hr />
          {!creatingPoll ? (
            <button onClick={() => setCreatingPoll(true)} style={{ background: '#0d6efd', color: '#fff', padding: '8px 12px', border: 'none', borderRadius: '4px', marginTop: '10px', cursor: 'pointer', width: '100%' }}>➕ 새 투표 만들기</button>
          ) : (
            <div style={{ marginTop: '15px' }}>
              <h4>📝 새 투표 만들기</h4>
              <input type="text" placeholder="투표 제목 (예: 다음 모임 날짜)" value={newPoll.title} onChange={(e) => setNewPoll(p => ({ ...p, title: e.target.value }))} style={{ width: '100%', marginBottom: '10px', padding: '8px', boxSizing: 'border-box' }} aria-label="투표 제목 입력" />
              <p style={{fontSize: '14px', margin: '0 0 5px 0'}}>항목</p>
              {newPoll.options.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '5px', marginBottom: '6px' }}>
                  <input type="text" placeholder={`항목 ${idx + 1}`} value={opt} onChange={(e) => {
                      const updated = [...newPoll.options]; updated[idx] = e.target.value; setNewPoll(p => ({ ...p, options: updated }));
                    }} style={{ flex: 1, padding: '6px' }} aria-label={`투표 항목 ${idx + 1} 입력`} />
                  {newPoll.options.length > 2 && <button type="button" onClick={() => setNewPoll(p => ({ ...p, options: p.options.filter((_, i) => i !== idx) }))}>❌</button>}
                </div>
              ))}
              <button type="button" onClick={() => setNewPoll(p => ({ ...p, options: [...p.options, ''] }))}>➕ 항목 추가</button>
              <button
                type="button"
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
              <div style={{marginTop: '10px'}}><label>마감일 설정 (선택): <input type="datetime-local" value={newPoll.deadline} onChange={(e) => setNewPoll(p => ({ ...p, deadline: e.target.value }))} aria-label="투표 마감일 선택" /></label></div>
              <div style={{marginTop: '20px', textAlign: 'center'}}>
                <button type="button" onClick={handleCreatePoll} style={{ background: '#198754', color: '#fff', padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📨 투표 등록</button>
                <button type="button" onClick={() => { setCreatingPoll(false); setNewPoll({ title: '', options: ['', ''], deadline: '', allowMultiple: false, isSecret: false, isAnonymous: false }); }} style={{ marginLeft: '8px', background: '#6c757d', color: '#fff', padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>취소</button>
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
          <button type="button" onClick={() => setInviteTab('search')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '4px', background: inviteTab === 'search' ? '#0d6efd' : '#eee', color: inviteTab === 'search' ? '#fff' : '#000', cursor: 'pointer' }}>🔍 사용자 검색</button>
          <button type="button" onClick={() => setInviteTab('link')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '4px', background: inviteTab === 'link' ? '#0d6efd' : '#eee', color: inviteTab === 'link' ? '#fff' : '#000', cursor: 'pointer' }}>🔗 링크 초대</button>
        </div>
        {inviteTab === 'search' && (
          <div>
            <div style={{ display: 'flex', gap: '5px' }}>
              <input placeholder="닉네임 검색 (예: 홍길동)" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ flex: 1, marginBottom: '10px', padding: '8px' }} aria-label="닉네임 검색" />
              <button type="button" onClick={handleSearchUsers} style={{ marginBottom: '10px', padding: '8px', cursor: 'pointer' }} aria-label="사용자 검색">🔍</button>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, maxHeight: '150px', overflowY: 'auto' }}>
              {searchResults.map(user => (
                <li key={user.uid} style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{user.name} ({user.nickname})</span>
                  <button type="button" onClick={() => handleInviteUser(user.uid, user.nickname)} style={{ marginLeft: '10px', cursor: 'pointer' }}>초대</button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {inviteTab === 'link' && (
          <div>
            <p>아래 링크를 복사하거나 공유하세요:</p>
            <input type="text" value={`${window.location.origin}/chat/invite/${roomId}`} readOnly style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} aria-label="초대 링크" />
            <button type="button" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/chat/invite/${roomId}`); alert('링크가 복사되었습니다!'); }} style={{ marginTop: '8px', cursor: 'pointer' }}>📋 복사</button>
          </div>
        )}
        <button type="button" onClick={() => closeModal(setShowInviteModal)} style={{ marginTop: '20px', padding: '8px 12px', background: '#6c757d', color: '#fff', cursor: 'pointer', border: 'none', borderRadius: '4px' }}>닫기</button>
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