import React, { useState } from 'react';
import InquiryForm from '../components/InquiryForm';
import InquiryList from '../components/InquiryList';

const InquiriesPage = ({ userInfo, isAdmin }) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleInquiryAdded = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="inquiries-page">
      <h2>문의사항</h2>
      <p>모임, 커뮤니티, 이용 관련 문의를 남겨주시면 관리자가 빠르게 답변드릴게요!</p>
      <div className="card">
        <h3>문의 작성</h3>
        <InquiryForm onInquiryAdded={handleInquiryAdded} userInfo={userInfo} />
      </div>
      <div className="card">
        <h3>문의 목록</h3>
        <InquiryList refreshKey={refreshKey} userInfo={userInfo} isAdmin={isAdmin} />
      </div>
    </div>
  );
};

export default InquiriesPage;