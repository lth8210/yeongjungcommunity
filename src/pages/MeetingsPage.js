import { useState } from 'react';
import MeetingForm from '../components/MeetingForm';
import MeetingList from '../components/MeetingList';

const MeetingsPage = ({ userInfo }) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleMeetingAdded = () => {
    setRefreshKey((prevKey) => prevKey + 1);
  };

  return (
    <div className="meetings-page" style={{ padding: 16 }}>
      <h2>모임</h2>
      <p style={{ color: '#666', marginBottom: 16 }}>관심사가 비슷한 이웃과 함께 즐거운 모임을 만들어보세요.</p>
      <div className="form-section" style={{ marginBottom: 24 }}>
        <MeetingForm onMeetingAdded={handleMeetingAdded} userInfo={userInfo} /> {/* 제목은 MeetingForm 내부에 */}
      </div>
      <div className="list-section">
        <h3>전체 모임 목록</h3>
        <MeetingList key={refreshKey} userInfo={userInfo} />
      </div>
    </div>
  );
};

export default MeetingsPage;