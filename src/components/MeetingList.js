// src/components/MeetingList.js

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, auth } from '../firebase';
import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  doc, 
  deleteDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  getDoc 
} from "firebase/firestore";

// 신청자/참여자 정보를 표시하는 별도의 컴포넌트
const ApplicantInfo = ({ uid, type, onApprove, onReject }) => {
  const [userInfo, setUserInfo] = useState({ name: '불러오는 중...' });

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const userDocRef = doc(db, "users", uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserInfo(userDoc.data());
        } else {
          setUserInfo({ name: '알 수 없는 사용자' });
        }
      } catch (error) {
        console.error("사용자 정보 조회 오류:", error);
        setUserInfo({ name: '정보 조회 실패' });
      }
    };
    fetchUserInfo();
  }, [uid]);

  return (
    <li className="applicant-item">
      <span>{userInfo.name || userInfo.email}</span>
      {type === 'pending' && (
        <div className="approval-buttons">
          <button className="approve-button" onClick={() => onApprove(uid, userInfo.name || userInfo.email)}>승인</button>
          <button className="reject-button" onClick={() => onReject(uid)}>거절</button>
        </div>
      )}
    </li>
  );
};


const MeetingList = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState(null);
  const [updatedTitle, setUpdatedTitle] = useState('');
  const [updatedDescription, setUpdatedDescription] = useState('');
  const [updatedLocation, setUpdatedLocation] = useState('');
  const [updatedMeetingTime, setUpdatedMeetingTime] = useState('');

  const currentUser = auth.currentUser;

  const fetchMeetings = async () => {
    try {
      const q = query(collection(db, "meetings"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const meetingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMeetings(meetingsData);
    } catch (error) {
      console.error("모임 목록 불러오기 중 오류: ", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("정말로 이 모임을 삭제하시겠습니까? 관련 채팅방도 함께 삭제됩니다.")) {
      try {
        await deleteDoc(doc(db, "meetings", id));
        await deleteDoc(doc(db, "chatRooms", id));
        alert("모임과 관련 채팅방이 삭제되었습니다.");
        fetchMeetings();
      } catch (error) { console.error("모임 삭제 중 오류:", error); }
    }
  };

  const handleSave = async (id) => {
    if (!updatedTitle || !updatedDescription || !updatedLocation || !updatedMeetingTime) {
      alert("모든 필드를 입력해주세요.");
      return;
    }
    try {
      const meetingDoc = doc(db, "meetings", id);
      const chatRoomDoc = doc(db, "chatRooms", id);
      await updateDoc(meetingDoc, { title: updatedTitle, description: updatedDescription, location: updatedLocation, meetingTime: updatedMeetingTime });
      await updateDoc(chatRoomDoc, { roomName: updatedTitle });
      alert("모임 정보가 수정되었습니다.");
      setEditingId(null);
      fetchMeetings();
    } catch (error) { console.error("모임 수정 중 오류:", error); }
  };

  const handleEdit = (meeting) => {
    setEditingId(meeting.id);
    setUpdatedTitle(meeting.title);
    setUpdatedDescription(meeting.description);
    setUpdatedLocation(meeting.location);
    setUpdatedMeetingTime(meeting.meetingTime);
  };

  const handleCancel = () => { setEditingId(null); };

  const handleApply = async (id) => {
  const user = auth.currentUser;
  if (!user) return;

  const meetingRef = doc(db, "meetings", id);
  const meetingSnap = await getDoc(meetingRef);
  const meetingData = meetingSnap.data();

  const max = meetingData.maxParticipants;
  const current = meetingData.applicants?.length || 0;

  if (max && current >= max) {
    alert("해당 모임은 최대 인원에 도달했습니다.");
    return;
  }

  await updateDoc(meetingRef, {
    pendingApplicants: arrayUnion(user.uid),
  });
  alert("모임 신청 완료. 승인을 기다려주세요.");
  fetchMeetings();
};

  const handleCancelApply = async (id) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await updateDoc(doc(db, "meetings", id), { pendingApplicants: arrayRemove(user.uid) });
      alert("신청이 취소되었습니다.");
      fetchMeetings();
    } catch (error) { console.error("신청 취소 중 오류:", error); }
  };

  const handleApprove = async (meetingId, userId, userName) => {
    try {
      await updateDoc(doc(db, "meetings", meetingId), { pendingApplicants: arrayRemove(userId), applicants: arrayUnion(userId) });
      await updateDoc(doc(db, "chatRooms", meetingId), { participants: arrayUnion(userId), participantNames: arrayUnion(userName) });
      alert(`${userName}님의 신청을 승인했습니다.`);
      fetchMeetings();
    } catch (error) { console.error("승인 처리 중 오류:", error); }
  };

  const handleReject = async (meetingId, userId) => {
    try {
      await updateDoc(doc(db, "meetings", meetingId), { pendingApplicants: arrayRemove(userId) });
      alert("신청을 거절했습니다.");
      fetchMeetings();
    } catch (error) { console.error("거절 처리 중 오류:", error); }
  };

  const formatMeetingTime = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('ko-KR'); 
  };

  if (loading) return <div>목록을 불러오는 중...</div>;

  return (
    <>
      {meetings.length === 0 ? (
        <div className="empty-message-card card">
          <p>아직 개설된 모임이 없습니다. 첫 모임을 만들어보세요!</p>
        </div>
      ) : (
        meetings.map(meeting => {
          const isPending = currentUser && meeting.pendingApplicants?.includes(currentUser.uid);
          const isApplicant = currentUser && meeting.applicants.includes(currentUser.uid);
          const isHost = currentUser && currentUser.uid === meeting.hostId;

          return (
            <div key={meeting.id} className="meeting-item">
              {editingId === meeting.id && isHost ? (
                <div className="edit-form">
                  <input type="text" value={updatedTitle} onChange={e => setUpdatedTitle(e.target.value)} />
                  <textarea value={updatedDescription} onChange={e => setUpdatedDescription(e.target.value)}></textarea>
                  <input type="text" value={updatedLocation} onChange={e => setUpdatedLocation(e.target.value)} />
                  <input type="datetime-local" value={updatedMeetingTime} onChange={e => setUpdatedMeetingTime(e.target.value)} />
                  <div className="button-group">
                    <button className="save-button" onClick={() => handleSave(meeting.id)}>저장</button>
                    <button className='cancel-button' onClick={handleCancel}>취소</button>
                  </div>
                </div>
              ) : (
                <>
                  <h4><Link to={`/meeting/${meeting.id}`}>{meeting.title}</Link></h4>
                  <p>{meeting.description}</p>
                  <div className="meeting-details">
                    <span><strong>장소:</strong> {meeting.location}</span>
                    <span><strong>시간:</strong> {formatMeetingTime(meeting.meetingTime)}</span>
                    <span><strong>주최자:</strong> {meeting.hostName}</span>
                    <span><strong>제한:</strong> {meeting.maxParticipants ? `${meeting.maxParticipants}명` : '제한 없음'}</span> {/* ✅ 추가 */}
                  </div>
                  
                  <div className="interaction-area">
                    <span className="applicant-count">
                      참여 인원: {meeting.applicants.length}명
                      {meeting.pendingApplicants?.length > 0 && ` (대기 ${meeting.pendingApplicants.length}명)`}
                    </span>
                    <div className="button-group">
                      {!isHost && !isApplicant && !isPending && ( <button className="apply-button" onClick={() => handleApply(meeting.id)}>신청하기</button> )}
                      {!isHost && isPending && ( <button className="cancel-apply-button" onClick={() => handleCancelApply(meeting.id)}>신청 취소</button> )}
                      {!isHost && isApplicant && ( <span className="status-text">참여 확정</span> )}
                      {isHost && ( <> <button className="edit-button" onClick={() => handleEdit(meeting)}>수정</button> <button className="delete-button" onClick={() => handleDelete(meeting.id)}>삭제</button> </> )}
                    </div>
                  </div>

                  {isHost && meeting.pendingApplicants?.length > 0 && (
                    <div className="applicant-list pending-list">
                      <strong>신청 대기자 목록:</strong>
                      <ul>{meeting.pendingApplicants.map(uid => <ApplicantInfo key={uid} uid={uid} type="pending" onApprove={(userId, userName) => handleApprove(meeting.id, userId, userName)} onReject={() => handleReject(meeting.id, uid)}/>)}</ul>
                    </div>
                  )}
                  {isHost && meeting.applicants.length > 0 && (
                    <div className="applicant-list">
                      <strong>최종 참여자 목록:</strong>
                      <ul>{meeting.applicants.map(uid => <ApplicantInfo key={uid} uid={uid} type="approved" />)}</ul>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })
      )}
    </>
  );
};

export default MeetingList;