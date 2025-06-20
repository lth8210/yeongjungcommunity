// InquiryForm.js
import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const InquiryForm = ({ onInquiryAdded, userInfo }) => {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      setSubmitting(true);
      await addDoc(collection(db, 'inquiries'), {
        content,
        userName: userInfo?.name || '익명',
        userId: userInfo?.uid || '',
        createdAt: serverTimestamp(),
      });
      setContent('');
      onInquiryAdded();
    } catch (error) {
      console.error('문의 제출 실패:', error);
      alert('문의 제출 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        placeholder="문의 내용을 입력해주세요."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
      />
      <button type="submit" disabled={submitting}>
        {submitting ? '제출 중...' : '문의 제출'}
      </button>
    </form>
  );
};

export default InquiryForm;