// src/components/MeetingBoard.js

import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  addDoc, 
  serverTimestamp,
  deleteDoc,
  doc
} from "firebase/firestore";

const MeetingBoard = ({ meetingId, userInfo }) => {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const currentUser = auth.currentUser;

  // 실시간으로 하위 컬렉션의 게시글 가져오기
  useEffect(() => {
    if (!meetingId) return;
    const q = query(collection(db, "meetings", meetingId, "board"), orderBy("createdAt"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(postsData);
    });
    return () => unsubscribe();
  }, [meetingId]);

  // 새 글 작성
  const handleAddPost = async (e) => {
    e.preventDefault();
    if (newPost.trim() === '' || !userInfo) return;
    
    await addDoc(collection(db, "meetings", meetingId, "board"), {
      text: newPost,
      createdAt: serverTimestamp(),
      authorId: userInfo.uid,
      authorName: userInfo.name
    });
    setNewPost('');
  };

  // 글 삭제
  const handleDeletePost = async (postId) => {
    if (window.confirm("정말로 이 글을 삭제하시겠습니까?")) {
      await deleteDoc(doc(db, "meetings", meetingId, "board", postId));
    }
  };

  return (
    <div className="meeting-board">
      <h3>모임 게시판</h3>
      <div className="board-post-list">
        {posts.map(post => (
          <div key={post.id} className="board-post-item">
            <div className="post-meta">
              <strong>{post.authorName}</strong>
              <small>{post.createdAt?.toDate().toLocaleString()}</small>
            </div>
            <p>{post.text}</p>
            {/* 본인 글만 삭제 가능 */}
            {currentUser && currentUser.uid === post.authorId && (
              <button className="delete-post-button" onClick={() => handleDeletePost(post.id)}>삭제</button>
            )}
          </div>
        ))}
      </div>
      <form onSubmit={handleAddPost} className="board-form">
        <textarea 
          value={newPost}
          onChange={e => setNewPost(e.target.value)}
          placeholder="모임 구성원들과 이야기를 나눠보세요."
        />
        <button type="submit">글쓰기</button>
      </form>
    </div>
  );
};

export default MeetingBoard;