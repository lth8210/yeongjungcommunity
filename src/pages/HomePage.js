import { useState } from 'react';
import PostForm from '../components/PostForm';
import PostList from '../components/PostList';
import MeetingCarousel from '../components/MeetingCarousel'; // ✅ 추가

const HomePage = ({ userInfo }) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePostAdded = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <div className="homepage">
      {/* ✅ 모집 중인 모임 캐러셀 - 클릭 시 상세 페이지로 이동하며 설명 표시 */}
      <MeetingCarousel 
        onMeetingClick={(meetingId) => {
          window.location.href = `/meeting/${meetingId}`;
        }}
        showDescription={true}
      />

      <h2>자유 게시판</h2>
      <p>다양한 이야기를 자유롭게 나눠보세요.</p>

      <div className="form-section">
        <PostForm userInfo={userInfo} onPostAdded={handlePostAdded} />
      </div>

      <div className="list-section">
        <h3>전체 글 목록</h3>
        <PostList key={refreshKey} userInfo={userInfo} />
      </div>
    </div>
  );
};

export default HomePage;