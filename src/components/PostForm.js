// src/components/PostForm.js

import { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const PostForm = ({ userInfo, onPostAdded }) => {
  // [1] 상태 정의
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // [2] 글 등록 함수
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const user = auth.currentUser;
    if (!user || !userInfo) {
      alert("글을 작성하려면 로그인이 필요합니다.");
      setIsLoading(false);
      return;
    }
    if (!category) {
      alert("카테고리를 선택해주세요.");
      setIsLoading(false);
      return;
    }
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      setIsLoading(false);
      return;
    }

    try {
      const authorName = userInfo.name || user.email;

      // [3] Firestore에 저장: category, status, applicants 필드 추가
      await addDoc(collection(db, "posts"), {
        title: title,
        content: content,
        category: category,         // 카테고리 필드
        status: "open",             // 진행중(open)/완료(done)
        applicants: [],             // 신청자 명단(UID 배열)
        authorId: user.uid,
        authorName: authorName,
        timestamp: serverTimestamp(),
      });

      alert("글이 성공적으로 등록되었습니다!");
      setCategory('');
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

  // [4] 렌더링
  return (
    <form onSubmit={handleSubmit} className="post-form">
      <h3>새 글 작성</h3>
      {/* [A] 카테고리 선택 (제목 위에 위치) */}
      <select
        value={category}
        onChange={e => setCategory(e.target.value)}
        required
        style={{ marginBottom: '12px', padding: '8px', borderRadius: '6px' }}
      >
        <option value="">카테고리 선택</option>
        <option value="share">이거 나눠요</option>
        <option value="together">이거 함께해요</option>
        <option value="free">자유글</option>
      </select>

      {/* [B] 제목 입력 */}
      <input
        type="text"
        placeholder="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      {/* [C] 내용 입력 */}
      <textarea
        placeholder="내용"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
      ></textarea>

      {/* [D] 등록 버튼 */}
      <button type="submit" disabled={isLoading}>
        {isLoading ? '등록 중...' : '글쓰기'}
      </button>
    </form>
  );
};

export default PostForm;