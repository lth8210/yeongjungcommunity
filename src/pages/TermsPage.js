// src/pages/TermsPage.js
import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const TermsPage = () => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const docRef = doc(db, 'policies', 'terms');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setContent(docSnap.data().content || '내용이 없습니다.');
        } else {
          setContent('약관 문서를 찾을 수 없습니다.');
        }
      } catch (error) {
        console.error("약관 불러오기 오류:", error);
        setContent('약관을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchTerms();
  }, []);

  return (
    <div className="page-container">
      <h2>이용약관</h2>
      <p>
        본 약관은 영중 행복마을 앱(이하 '본 서비스')의 이용조건 및 절차, 이용자와 운영자의 권리·의무 등을 규정함을 목적으로 합니다.
      </p>
      <hr />
      <pre style={{ whiteSpace: 'pre-wrap' }}>
        {loading ? '로딩 중입니다...' : content}
      </pre>
    </div>
  );
};

export default TermsPage;