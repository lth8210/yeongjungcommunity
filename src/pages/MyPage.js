// src/pages/HomePage.js

import React, { useState, useEffect } from 'react';
import { onSnapshot, doc, collection, query, orderBy } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { getDocs, where, updateDoc, deleteDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { deleteUser } from 'firebase/auth';

// NOTE: The following is the MyPage implementation as per the instructions
const MyPage = ({ userInfo }) => {
  const [myMeetings, setMyMeetings] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [myOwnedMeetings, setMyOwnedMeetings] = useState([]);
  const [pendingMeetings, setPendingMeetings] = useState([]);

  useEffect(() => {
    const fetchMeetingData = async () => {
      if (!userInfo?.uid) return;
      try {
        const q = query(collection(db, "meetings"), orderBy("meetingTime", "desc"));
        const querySnapshot = await getDocs(q);
        const allMeetings = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const owned = allMeetings.filter(m => m.creatorId === userInfo.uid);
        const approved = allMeetings.filter(m => Array.isArray(m.applicants) && m.applicants.includes(userInfo.uid));
        const pending = allMeetings.filter(m => Array.isArray(m.pendingApplicants) && m.pendingApplicants.includes(userInfo.uid));

        setMyMeetings(approved);
        setMyOwnedMeetings(owned);
        setPendingMeetings(pending);
      } catch (err) {
        console.error("모임 정보 조회 실패:", err);
      }
    };
    fetchMeetingData();
  }, [userInfo]);

  // 실시간 새 메시지 알림 감지
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'chatRooms'), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        // const roomId = change.doc.id; // (삭제됨: unused)
        const data = change.doc.data();

        // Display chat room announcement and participant nicknames
        const announcement = data.description || "채팅방에 오신 것을 환영합니다.";
        const participants = data.participants || [];
        const nicknameList = participants.map(p => p.nickname || p.uid).join(', ');
        console.log(`📢 ${announcement}`);
        console.log(`👥 참여자: ${nicknameList}`);

        const lastMessage = data.lastMessage || '';
        const updatedAt = data.updatedAt?.toDate();
        const currentUid = auth.currentUser?.uid;

        // 새 메시지이고, 본인이 보낸 게 아닌 경우에만 알림
        if (
          change.type === 'modified' &&
          data.lastSenderId !== currentUid &&
          (!data.lastRead?.[currentUid] || updatedAt > data.lastRead?.[currentUid]?.toDate())
        ) {
          // 간단한 알림 - 추후 소리, 뱃지 등 확장 가능
          alert(`새 메시지: ${lastMessage}`);
        }
      });
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchMyPosts = async () => {
      if (!userInfo?.uid) return;
      try {
        const q = query(collection(db, "posts"), where("authorId", "==", userInfo.uid), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        const postsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMyPosts(postsData);
      } catch (error) {
        console.error("내가 쓴 글을 불러오는 중 오류:", error);
      }
    };

    fetchMyPosts();
  }, [userInfo]);

  // 프로필 수정 state 및 함수
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(userInfo.name || '');
  const [nickname, setNickname] = useState(userInfo.nickname || '');
  const [phone, setPhone] = useState(userInfo.phone || '');

  const handleProfileSave = async () => {
    try {
      const userRef = doc(db, "users", userInfo.uid);
      console.log("업데이트 시도:", userRef.path, { name, phone });
      await updateDoc(userRef, { name, phone, nickname });
      alert("프로필이 수정되었습니다.");
      setIsEditing(false);
    } catch (err) {
      console.error("프로필 수정 오류:", err);
      alert("프로필 수정 실패: " + err.message);
    }
  };

  return (
    <div className="mypage-container">
      <div className="card">
        <h3>프로필 정보</h3>
        {isEditing ? (
          <>
            <p>
              <label>닉네임: </label>
              <input value={nickname} onChange={(e) => setNickname(e.target.value)} />
            </p>
            <p>
              <label>이름(실명): </label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </p>
            <p>
              <label>전화번호: </label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </p>
            <button className="save-button" onClick={handleProfileSave}>저장</button>
            <button className="cancel-button" onClick={() => setIsEditing(false)}>취소</button>
          </>
        ) : (
          <>
            <p><strong>이메일:</strong> {userInfo.email}</p>
            <p><strong>실명:</strong> {userInfo.name}</p>
            <p><strong>닉네임:</strong> {userInfo.nickname}</p>
            <p><strong>전화번호:</strong> {userInfo.phone || '등록되지 않음'}</p>
            <button className="edit-button" onClick={() => setIsEditing(true)}>프로필 수정</button>
          </>
        )}
      </div>

      <div className="card">
        <h3>내가 쓴 글 목록</h3>
        {myPosts.length > 0 ? (
          myPosts.map(post => (
            <div key={post.id}>
              <h4>{post.title}</h4>
              <p>{post.content?.slice(0, 50)}...</p>
            </div>
          ))
        ) : (
          <p>작성한 글이 없습니다.</p>
        )}
      </div>

      <div className="card">
  <h3>받은 쪽지함</h3>
  <p>다른 회원에게 받은 쪽지를 확인해보세요.</p>
  <Link to="/my-messages">
    <button className="view-messages-button">📨 받은 쪽지 보기</button>
  </Link>
</div>

      <div className="card">
        <h3>내가 주최한 모임</h3>
        {myOwnedMeetings.length > 0 ? (
          myOwnedMeetings.map(meeting => (
            <Link to={`/meeting/${meeting.id}`} key={meeting.id} className="my-meeting-card">
              <h4>{meeting.title}</h4>
              <p><strong>일시:</strong> {new Date(meeting.meetingTime).toLocaleString('ko-KR')}</p>
              <p><strong>장소:</strong> {meeting.location}</p>
            </Link>
          ))
        ) : (
          <p>주최한 모임이 없습니다.</p>
        )}
      </div>

      <div className="card">
        <h3>내가 참여 확정된 모임</h3>
        {myMeetings.length > 0 ? (
          <div className="my-meetings-list">
            {myMeetings.map(meeting => (
              <Link to={`/meeting/${meeting.id}`} key={meeting.id} className="my-meeting-card">
                <h4>{meeting.title}</h4>
                <p><strong>일시:</strong> {new Date(meeting.meetingTime).toLocaleString('ko-KR')}</p>
                <p><strong>장소:</strong> {meeting.location}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty-message">참여 확정된 모임이 없습니다.</p>
        )}
      </div>

      <div className="card">
        <h3>신청했으나 대기 중인 모임</h3>
        {pendingMeetings.length > 0 ? (
          pendingMeetings.map(meeting => (
            <Link to={`/meeting/${meeting.id}`} key={meeting.id} className="my-meeting-card">
              <h4>{meeting.title}</h4>
              <p><strong>일시:</strong> {new Date(meeting.meetingTime).toLocaleString('ko-KR')}</p>
              <p><strong>장소:</strong> {meeting.location}</p>
            </Link>
          ))
        ) : (
          <p>대기 중인 모임이 없습니다.</p>
        )}
      </div>

      <div className="card">
        <h3>참여 중인 채팅방</h3>
        <ul>
          {myMeetings.map(meeting => (
            <li key={meeting.id}>
              <Link to={`/chat/${meeting.id}`}>
                {meeting.title}
                <span className="badge">🔔</span>
              </Link>
              <div className="participant-list">
                👥 참가자: {(meeting.participants || []).map(p => p.nickname || p.uid).join(', ')}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="withdrawal-section card">
        <h3>회원 탈퇴</h3>
        <p>회원 탈퇴 시 계정 정보가 영구적으로 삭제되며 복구할 수 없습니다.</p>
        <button className="withdrawal-button" onClick={async () => {
  const confirmed = window.confirm("정말로 회원 탈퇴를 진행하시겠습니까? 탈퇴 후에는 복구가 어렵습니다.");
  if (!confirmed) return;

  try {
    const userRef = doc(db, "users", userInfo.uid);
    // ✅ 실제 삭제 대신 소프트 삭제 플래그와 익명화 처리
    await updateDoc(userRef, {
      isDisabled: true,
      deletedAt: new Date(),
      nickname: "탈퇴회원",
      name: "",
      email: `deleted_${userInfo.uid}@example.com`
    });
    alert("회원 탈퇴 처리가 완료되었습니다.");
    // 로그아웃
    const userAuth = auth.currentUser;
    if (userAuth) await deleteUser(userAuth);
    window.location.href = "/";
  } catch (err) {
    console.error("탈퇴 오류:", err);
    alert("회원 탈퇴 중 오류가 발생했습니다.");
  }
}}>
  회원 탈퇴하기
</button>
      </div>
    </div>
  );
};

export default MyPage;