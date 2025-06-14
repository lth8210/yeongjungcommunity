// src/components/PostForm.js

import { useState } from 'react';
// doc, getDoc이 사용되지 않으므로 import에서 제거합니다.
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const PostForm = ({ userInfo, onPostAdded }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const user = auth.currentUser;
    if (!user || !userInfo) {
      alert("글을 작성하려면 로그인이 필요합니다.");
      setIsLoading(false);
      return;
    }
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      setIsLoading(false);
      return;
    }

    try {
      // 이제 userProfile을 다시 불러올 필요 없이, props로 받은 userInfo를 사용합니다.
      const authorName = userInfo.name || user.email;

      await addDoc(collection(db, "posts"), {
        title: title,
        content: content,
        authorId: user.uid,
        authorName: authorName,
        timestamp: serverTimestamp(),
      });
      
      alert("글이 성공적으로 등록되었습니다!");
      setTitle('');
      setContent('');
      
      if (onPostAdded) {
        onPostAdded();
      }
    } catch (error) {
      console.error("글 등록 중 오류: ", error);
      alert("글 등록에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="post-form">
      <h3>새 글 작성</h3>
      <input 
        type="text" 
        placeholder="제목" 
        value={title} 
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea 
        placeholder="내용" 
        value={content}
        onChange={(e) => setContent(e.target.value)}
      ></textarea>
      <button type="submit" disabled={isLoading}>
        {isLoading ? '등록 중...' : '글쓰기'}
      </button>
    </form>
  );
};

export default PostForm;