// src/pages/PrivacyPage.js
import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const PrivacyPage = () => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrivacy = async () => {
      try {
        const docRef = doc(db, 'policies', 'privacy');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setContent(docSnap.data().content || '내용이 없습니다.');
        } else {
          setContent('개인정보처리방침 문서를 찾을 수 없습니다.');
        }
      } catch (error) {
        console.error("개인정보처리방침 불러오기 오류:", error);
        setContent('개인정보처리방침을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchPrivacy();
  }, []);

  return (
    <div className="page-container">
      <h2>개인정보처리방침</h2>
      <p>
        본 개인정보처리방침은 「개인정보 보호법」에 따라 영중 행복마을이 제공하는 온라인 서비스(앱 및 웹사이트)를 이용하는 이용자의 개인정보 보호를 위해 수립되었습니다.
      </p>
      <hr />
      <pre style={{ whiteSpace: 'pre-wrap' }}>
        {loading ? '로딩 중입니다...' : content}
      </pre>
    </div>
  );
};

export default PrivacyPage;