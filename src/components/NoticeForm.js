// src/components/NoticeForm.js

import { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const NoticeForm = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    // 이 컴포넌트는 관리자만 볼 수 있지만, 한 번 더 확인하는 것이 안전합니다.
    if (!user) { return; }

    if (!title || !content) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    try {
      await addDoc(collection(db, "notices"), {
        title: title,
        content: content,
        authorId: user.uid,
        authorName: user.displayName || user.email, // displayName이 있으면 사용, 없으면 email
        createdAt: serverTimestamp(),
      });
      alert("공지가 등록되었습니다.");
      setTitle('');
      setContent('');
      window.location.reload();
    } catch (error) {
      console.error("공지 등록 중 오류: ", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="notice-form">
      <h3>새 공지 작성</h3>
      <input 
        type="text" 
        placeholder="공지 제목" 
        value={title} 
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea 
        placeholder="공지 내용" 
        value={content}
        onChange={(e) => setContent(e.target.value)}
      ></textarea>
      <button type="submit">공지 등록</button>
    </form>
  );
};

export default NoticeForm;