// src/pages/NoticesPage.js

import { useState } from 'react';
import { auth } from '../firebase';
import { ADMIN_UIDS } from '../config';
import NoticeForm from '../components/NoticeForm';
import NoticeList from '../components/NoticeList';

const NoticesPage = ({ userInfo }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const currentUser = auth.currentUser;
  const isAdmin = currentUser && ADMIN_UIDS.includes(currentUser.uid);

  const handleNoticeAdded = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <div className="notices-page">
      <h2>공지사항</h2>
      
      {isAdmin && (
        <div className="form-section">
          <h3>새 공지 작성</h3>
          <NoticeForm onNoticeAdded={handleNoticeAdded} userInfo={userInfo} />
        </div>
      )}
      
      <div className="list-section">
        <h3>전체 공지</h3>
        <NoticeList key={refreshKey} userInfo={userInfo} />
      </div>
    </div>
  );
};

export default NoticesPage;