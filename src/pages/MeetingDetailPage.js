// src/pages/MeetingDetailPage.js

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase'; // auth는 사용되지 않으므로 제거합니다.
import { doc, getDoc } from 'firebase/firestore';
import MeetingBoard from '../components/MeetingBoard';

const MeetingDetailPage = ({ userInfo }) => {
  const { meetingId } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        const docRef = doc(db, "meetings", meetingId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setMeeting({ id: docSnap.id, ...docSnap.data() });
        } else {
          console.log("해당 모임을 찾을 수 없습니다.");
        }
      } catch (error) {
        console.error("모임 정보 로드 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMeeting();
  }, [meetingId]);

  const formatMeetingTime = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('ko-KR'); 
  };

  if (loading) return <div>로딩 중...</div>;
  if (!meeting) return <div>모임 정보를 찾을 수 없습니다. <Link to="/meetings">목록으로 돌아가기</Link></div>;

  return (
    <div className="meeting-detail-page">
      <div className="meeting-header card">
        <h2>{meeting.title}</h2>
        <div className="meeting-meta">
          <span><strong>주최자:</strong> {meeting.hostName}</span>
          <span><strong>장소:</strong> {meeting.location}</span>
          <span><strong>시간:</strong> {formatMeetingTime(meeting.meetingTime)}</span>
        </div>
        <p className="meeting-description">{meeting.description}</p>
      </div>

      <div className="card">
        <MeetingBoard meetingId={meetingId} userInfo={userInfo} />
      </div>
    </div>
  );
};

export default MeetingDetailPage;