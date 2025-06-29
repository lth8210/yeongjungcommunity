import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { ADMIN_UIDS } from '../config';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  addDoc,           // ✅ 추가
  serverTimestamp,  // ✅ 추가
} from 'firebase/firestore';
import CommunityCard from './CommunityCard';
import MessageModal from './MessageModal';
import { findOrCreateOneToOneRoom } from '../utils/findOrCreateOneToOneRoom';
import { useNavigate } from 'react-router-dom';

const CATEGORYLABELS = {
  hobby: '취미',
  study: '학습',
  volunteer: '봉사',
  etc: '기타',
};
const CATEGORYDESCS = {
  hobby: '취미 모임 (예: 독서, 음악, 운동 등)',
  study: '학습 모임 (예: 스터디, 언어, 자격증 등)',
  volunteer: '봉사 모임 (예: 지역사회, 나눔, 환경 등)',
  etc: '기타 (위에 해당하지 않는 모임)',
};

const MeetingList = ({ userInfo }) => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersMap, setUsersMap] = useState({});
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [isEditing, setIsEditing] = useState(null);
  const [editedMeeting, setEditedMeeting] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const currentUser = auth.currentUser;
  const isAdmin = currentUser && ADMIN_UIDS.includes(currentUser.uid);

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
    const fetchMeetings = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'meetings'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const meetingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMeetings(meetingsData);
      } catch (error) {
        console.error('모임 목록 불러오기 오류:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMeetings();
  }, []);

  useEffect(() => {
    const fetchUsersMap = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const map = {};
        usersSnap.docs.forEach(doc => {
          const data = doc.data();
          map[doc.id] = {
            nickname: data.nickname,
            name: data.name,
          };
        });
        setUsersMap(map);
      } catch (err) {
        console.error('유저 맵 불러오기 오류:', err);
      }
    };
    fetchUsersMap();
  }, []);

  const getApplicantObjects = (uids = []) =>
    uids.map(uid => ({
      uid,
      nickname: usersMap[uid]?.nickname,
      name: usersMap[uid]?.name,
    }));

  const formatAuthorName = uid => {
    const user = usersMap[uid];
    if (!user) return '';
    return user.name ? `${user.name}${user.nickname ? `(${user.nickname})` : ''}` : user.nickname;
  };

  const handleApply = async meetingId => {
    if (!currentUser) return alert('로그인 후 신청할 수 있습니다.');
    try {
      await updateDoc(doc(db, 'meetings', meetingId), {
        pendingApplicants: arrayUnion(currentUser.uid),
      });
      setMeetings(meetings =>
        meetings.map(m =>
          m.id === meetingId
            ? { ...m, pendingApplicants: [...(m.pendingApplicants || []), currentUser.uid] }
            : m
        )
      );
      alert('신청이 완료되었습니다!');
    } catch (err) {
      alert('신청 실패');
      console.error(err);
    }
  };

  const handleApproveApplicant = async (meetingId, applicantId) => {
    if (!isAdmin && (!currentUser || currentUser.uid !== meetings.find(m => m.id === meetingId)?.hostId)) {
      return alert('승인 권한이 없습니다.');
    }
    try {
      await updateDoc(doc(db, 'meetings', meetingId), {
        applicants: arrayUnion(applicantId),
        pendingApplicants: arrayRemove(applicantId),
      });
      setMeetings(meetings =>
        meetings.map(m =>
          m.id === meetingId
            ? {
                ...m,
                applicants: [...(m.applicants || []), applicantId],
                pendingApplicants: (m.pendingApplicants || []).filter(uid => uid !== applicantId),
              }
            : m
        )
      );
      alert('승인되었습니다!');
    } catch (err) {
      alert('승인 실패');
      console.error(err);
    }
  };

  const handleCancelApply = async meetingId => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'meetings', meetingId), {
        pendingApplicants: arrayRemove(currentUser.uid),
      });
      setMeetings(meetings =>
        meetings.map(m =>
          m.id === meetingId
            ? {
                ...m,
                pendingApplicants: (m.pendingApplicants || []).filter(uid => uid !== currentUser.uid),
              }
            : m
        )
      );
      alert('신청이 취소되었습니다.');
    } catch (err) {
      alert('취소 실패');
      console.error(err);
    }
  };

  const handleComplete = async meetingId => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'meetings', meetingId), {
        status: 'done',
      });
      setMeetings(meetings =>
        meetings.map(m => (m.id === meetingId ? { ...m, status: 'done' } : m))
      );
      alert('모임이 완료 처리되었습니다.');
    } catch (err) {
      alert('완료 처리 실패');
      console.error(err);
    }
  };

  const handleEdit = meeting => {
    setIsEditing(meeting.id);
    setEditedMeeting({
      ...meeting,
      category: meeting.category || 'etc',
      title: meeting.title || '',
      description: meeting.description || '',
      location: meeting.location || '',
      meetingTime: meeting.meetingTime || '',
    });
  };

  const handleSave = async meetingId => {
    if (!currentUser) {
      alert('로그인 후 수정할 수 있습니다.');
      return;
    }
    if (isSaving) return;
    setIsSaving(true);
    const isAuthor = currentUser.uid === editedMeeting.hostId;
    if (!isAuthor && !isAdmin) {
      alert('수정 권한이 없습니다.');
      setIsSaving(false);
      return;
    }
    try {
      const meetingRef = doc(db, 'meetings', meetingId);
      await updateDoc(meetingRef, {
        title: editedMeeting.title,
        description: editedMeeting.description,
        location: editedMeeting.location,
        meetingTime: editedMeeting.meetingTime,
        category: editedMeeting.category || 'etc',
      });
      setMeetings(meetings =>
        meetings.map(m =>
          m.id === meetingId ? { ...m, ...editedMeeting } : m
        )
      );
      setIsEditing(null);
      setEditedMeeting({});
      alert('수정이 완료되었습니다!');
    } catch (error) {
      console.error('수정 오류:', error);
      alert('수정 실패: ' + (error.message || '알 수 없는 오류'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(null);
    setEditedMeeting({});
    setIsSaving(false);
  };

  const handleDelete = async meetingId => {
    if (!window.confirm('정말로 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'meetings', meetingId));
      setMeetings(meetings => meetings.filter(m => m.id !== meetingId));
      alert('삭제되었습니다.');
    } catch (err) {
      alert('삭제 실패');
      console.error(err);
    }
  };

  const openMessageModal = userObj => {
    setTargetUser(userObj);
    setMessageModalOpen(true);
  };

  const closeMessageModal = () => {
    setMessageModalOpen(false);
    setTargetUser(null);
  };

  const handleEnterGroupChat = (roomId) => {
  if (!roomId) {
    alert("연결된 채팅방 정보가 없습니다.");
    return;
  }
  navigate(`/chat/${roomId}`);
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

  if (loading)
    return (
      <div style={{ textAlign: 'center', padding: 20 }}>로딩 중...</div>
    );

  if (meetings.length === 0)
    return (
      <div style={{ textAlign: 'center', padding: 20, color: '#666' }}>
        <p>등록된 모임이 없습니다.</p>
      </div>
    );

  return (
    <div>
      {meetings.map(meeting => {
        const isApplicant = (meeting.applicants || []).includes(currentUser?.uid);
        const isAuthor = currentUser && currentUser.uid === meeting.hostId;
        const canEdit = isAuthor || isAdmin;
        const editing = isEditing === meeting.id;
        const applicants = getApplicantObjects(meeting.applicants || []);
        const pendingApplicants = getApplicantObjects(meeting.pendingApplicants || []);
        const authorName = formatAuthorName(meeting.hostId);

        return (
          <CommunityCard
            key={meeting.id}
            meetingId={meeting.id}
            title={
              editing ? (
                <input
                  value={editedMeeting.title}
                  onChange={e =>
                    setEditedMeeting({ ...editedMeeting, title: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: 6,
                    borderRadius: 4,
                    border: '1px solid #ccc',
                  }}
                />
              ) : (
                meeting.title
              )
            }
            content={
              editing ? (
                <textarea
                  value={editedMeeting.description}
                  onChange={e =>
                    setEditedMeeting({
                      ...editedMeeting,
                      description: e.target.value,
                    })
                  }
                  style={{
                    width: '100%',
                    minHeight: 80,
                    padding: 6,
                    borderRadius: 4,
                    border: '1px solid #ccc',
                  }}
                />
              ) : (
                meeting.description
              )
            }
            thumbnail={
              meeting.files && meeting.files.length > 0
                ? meeting.files[0].url
                : null
            }
            location={
              editing ? (
                <input
                  value={editedMeeting.location}
                  onChange={e =>
                    setEditedMeeting({
                      ...editedMeeting,
                      location: e.target.value,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: 6,
                    borderRadius: 4,
                    border: '1px solid #ccc',
                  }}
                />
              ) : (
                meeting.location
              )
            }
            category={
              editing ? (
                <select
                  value={editedMeeting.category || 'etc'}
                  onChange={e =>
                    setEditedMeeting({
                      ...editedMeeting,
                      category: e.target.value,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: 6,
                    borderRadius: 4,
                    border: '1px solid #ccc',
                  }}
                >
                  {Object.keys(CATEGORYLABELS).map(key => (
                    <option key={key} value={key}>
                      {CATEGORYLABELS[key]}
                    </option>
                  ))}
                </select>
              ) : (
                CATEGORYLABELS[meeting.category] || '기타'
              )
            }
            status={meeting.status}
            applicants={applicants}
            pendingApplicants={pendingApplicants}
            authorName={authorName}
            authorId={meeting.hostId}
            usersMap={usersMap}
            currentUser={userInfo}
            onApply={() => handleApply(meeting.id)}
            onCancelApply={() => handleCancelApply(meeting.id)}
            onApprove={applicantId => handleApproveApplicant(meeting.id, applicantId)}
            onComplete={() => handleComplete(meeting.id)}
            onEdit={() => handleEdit(meeting)}
            onDelete={() => handleDelete(meeting.id)}
            onMessage={openMessageModal}
            onChat={handleChat}
            isGroupChat={meeting.isGroupChat}
            onEnterGroupChat={() => handleEnterGroupChat(meeting.chatRoomId)}
            id={meeting.id}
            isApplicant={isApplicant}
            isAuthor={isAuthor}
            isAdmin={isAdmin}
            extraFields={
              <div style={{ color: '#666', fontSize: 13, marginBottom: 4 }}>
                {meeting.location}
                {' | '}
                {meeting.meetingTime
                  ? new Date(meeting.meetingTime).toLocaleString()
                  : ''}
                {isAuthor &&
                  meeting.pendingApplicants &&
                  meeting.pendingApplicants.length > 0 && (
                    <div>
                      <strong>승인 대기:</strong>
                      {pendingApplicants.map(user => (
                        <button
                          key={user.uid}
                          onClick={() => handleApproveApplicant(meeting.id, user.uid)}
                          style={{
                            marginLeft: 8,
                            padding: '2px 8px',
                            fontSize: 12,
                            background: '#e9ecef',
                            border: 'none',
                            borderRadius: 4,
                          }}
                        >
                          {user.nickname || user.name}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            }
          >
            {canEdit && editing && (
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleSave(meeting.id)}
                  style={{
                    padding: '8px 20px',
                    background: isSaving ? '#999' : '#1976d2',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 17,
                    fontWeight: 'bold',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                  }}
                  disabled={isSaving}
                  aria-disabled={isSaving}
                >
                  {isSaving ? '저장 중...' : '저장'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  style={{
                    padding: '8px 20px',
                    background: '#ccc',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 17,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  취소
                </button>
              </div>
            )}
          </CommunityCard>
        );
      })}
      {messageModalOpen && targetUser && (
        <MessageModal
          open={messageModalOpen}
          onClose={closeMessageModal}
          fromUser={userInfo}
          toUser={{ uid: targetUser.uid, nickname: targetUser.nickname }}
          onSend={sendMessage}
        />
      )}
    </div>
  );
};

export default MeetingList;