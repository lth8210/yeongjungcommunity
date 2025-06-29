import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import MeetingBoard from '../components/MeetingBoard';

const MeetingDetailPage = ({ userInfo }) => {
  const { meetingId } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editLocation, setEditLocation] = useState('');

  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        const docRef = doc(db, 'meetings', meetingId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() };
          setMeeting(data);
          setEditTitle(data.title || '');
          setEditDesc(data.description || '');
          setEditLocation(data.location || '');
        } else {
          setMeeting(null);
        }
      } catch (error) {
        console.error('모임 정보 로드 오류:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMeeting();
  }, [meetingId]);

  const handleSaveEdit = async () => {
    try {
      if (!meetingId) throw new Error('모임 ID가 유효하지 않습니다.');
      await updateDoc(doc(db, 'meetings', meetingId), {
        title: editTitle,
        description: editDesc,
        location: editLocation,
      });
      setMeeting((m) => ({
        ...m,
        title: editTitle,
        description: editDesc,
        location: editLocation,
      }));
      setIsEditing(false);
      alert('모임 정보가 수정되었습니다!');
    } catch (e) {
      console.error('수정 실패:', e);
      alert(`수정 실패: ${e.message}. 다시 시도해 주세요.`);
    }
  };

  const formatMeetingTime = (isoString) => {
    return isoString ? new Date(isoString).toLocaleString('ko-KR') : '';
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 20 }}>로딩 중...</div>;
  if (!meeting) return <div style={{ textAlign: 'center', padding: 20 }}>모임 정보를 찾을 수 없습니다. <Link to="/meetings">목록으로 돌아가기</Link></div>;

  const isHost = userInfo && userInfo.uid === meeting.creatorId;

  return (
    <div className="meeting-detail-page" style={{ padding: 16 }}>
      <div className="meeting-header card" style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 16 }}>
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
            />
            <input
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
            />
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc', minHeight: 80 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSaveEdit} style={{ padding: '8px 16px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                저장
              </button>
              <button onClick={() => setIsEditing(false)} style={{ padding: '8px 16px', background: '#ccc', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                취소
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 style={{ margin: '8px 0' }}>{meeting.title}</h2>
            <div className="meeting-meta" style={{ color: '#666', fontSize: 14, marginBottom: 8 }}>
              <span><strong>주최자:</strong> {meeting.hostName}</span>
              <span style={{ marginLeft: 16 }}><strong>장소:</strong> {meeting.location}</span>
              <span style={{ marginLeft: 16 }}><strong>시간:</strong> {formatMeetingTime(meeting.meetingTime)}</span>
            </div>
            <p className="meeting-description" style={{ marginBottom: 8 }}>{meeting.description}</p>
            {meeting.files && meeting.files.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <b>첨부파일:</b>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {meeting.files.map((file, idx) => (
                    <li key={idx} style={{ marginBottom: 8 }}>
                      {file.type && file.type.startsWith('image/') ? (
                        <img src={file.url} alt={file.originalName} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }} />
                      ) : (
                        <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2', textDecoration: 'underline' }}>
                          {file.originalName}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {isHost && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                style={{ padding: '8px 16px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              >
                수정
              </button>
            )}
          </>
        )}
      </div>
      <div className="card" style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
        <MeetingBoard meetingId={meetingId} userInfo={userInfo} />
      </div>
    </div>
  );
};

export default MeetingDetailPage;