// src/pages/MeetingsPage.js

import { useState } from 'react';
import MeetingForm from '../components/MeetingForm';
import MeetingList from '../components/MeetingList';

const MeetingsPage = ({ userInfo }) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleMeetingAdded = () => {
    setRefreshKey(prevKey => prevKey + 1); 
  };

  return (
    <div className="meetings-page">
      <h2>모임</h2>
      <p>관심사가 비슷한 이웃과 함께 즐거운 모임을 만들어보세요.</p>
      
      {/* 폼을 별도의 카드 섹션으로 분리 */}
      <div className="form-section">
        <h3>새 모임 만들기</h3>
        <MeetingForm onMeetingAdded={handleMeetingAdded} userInfo={userInfo} />
      </div>

      {/* 리스트를 별도의 섹션으로 분리하여 카드 디자인 적용 */}
      <div className="list-section">
        <h3>전체 모임 목록</h3>
        <MeetingList key={refreshKey} userInfo={userInfo} />
      </div>
    </div>
  );
};

export default MeetingsPage;