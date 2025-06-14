// src/components/ProposalForm.js

import { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const ProposalForm = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      alert("제안을 작성하려면 로그인이 필요합니다.");
      return;
    }
    if (!title || !content) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    try {
      await addDoc(collection(db, "proposals"), {
        title: title,
        content: content,
        authorId: user.uid,
        authorEmail: user.email,
        createdAt: serverTimestamp(),
        status: 'pending' // '검토중' 상태로 시작
      });
      alert("제안이 성공적으로 등록되었습니다. 관리자 검토 후 게시됩니다.");
      setTitle('');
      setContent('');
      window.location.reload();
    } catch (error) {
      console.error("제안 등록 중 오류: ", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="proposal-form">
      <h3>새로운 제안 작성하기</h3>
      <input 
        type="text" 
        placeholder="제안 제목" 
        value={title} 
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea 
        placeholder="제안 내용" 
        value={content}
        onChange={(e) => setContent(e.target.value)}
      ></textarea>
      <button type="submit">제안하기</button>
    </form>
  );
};

export default ProposalForm;