// src/components/PostList.js

import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { ADMIN_UIDS } from '../config';
import { collection, query, orderBy, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";

const PostList = ({ userInfo }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState(null);
  const [updatedTitle, setUpdatedTitle] = useState('');
  const [updatedContent, setUpdatedContent] = useState('');

  const currentUser = auth.currentUser;
  const isAdmin = currentUser && ADMIN_UIDS.includes(currentUser.uid);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        const postsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPosts(postsData);
      } catch (error) {
        console.error("게시글 목록 불러오기 오류: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []); // key prop이 바뀌면 이 컴포넌트는 새로 렌더링되므로, 의존성 배열은 비워둡니다.

  const handleDelete = async (id) => {
    if (window.confirm("정말로 이 글을 삭제하시겠습니까?")) {
      try {
        await deleteDoc(doc(db, "posts", id));
        // 화면에서 즉시 제거
        setPosts(posts.filter(p => p.id !== id));
        alert("글이 삭제되었습니다.");
      } catch (error) {
        console.error("글 삭제 중 오류:", error);
        alert("글 삭제에 실패했습니다.");
      }
    }
  };
  
  const handleSave = async (id) => {
    if (!updatedTitle.trim() || !updatedContent.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }
    try {
      await updateDoc(doc(db, "posts", id), {
        title: updatedTitle,
        content: updatedContent,
      });
      // 화면에서 즉시 수정
      setPosts(posts.map(p => p.id === id ? { ...p, title: updatedTitle, content: updatedContent } : p));
      setEditingId(null);
      alert("글이 수정되었습니다.");
    } catch (error) {
      console.error("글 수정 중 오류:", error);
      alert("글 수정에 실패했습니다.");
    }
  };
  
  const handleEdit = (post) => {
    setEditingId(post.id);
    setUpdatedTitle(post.title);
    setUpdatedContent(post.content);
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  if (loading) return <div>목록을 불러오는 중...</div>;

  return (
    <>
      {posts.length === 0 ? (
        <div className="empty-message-card">
            <p>아직 작성된 글이 없습니다. 첫 글을 작성해보세요!</p>
        </div>
      ) : (
        posts.map(post => (
          <div key={post.id} className="post-item">
            {editingId === post.id ? (
              <div className="edit-form">
                <input type="text" value={updatedTitle} onChange={e => setUpdatedTitle(e.target.value)} />
                <textarea value={updatedContent} onChange={e => setUpdatedContent(e.target.value)}></textarea>
                <div className="button-group">
                  <button className="save-button" onClick={() => handleSave(post.id)}>저장</button>
                  <button className='cancel-button' onClick={handleCancel}>취소</button>
                </div>
              </div>
            ) : (
              <>
                <div className="post-content">
                  <small className="author-name">{post.authorName}</small>
                  <h3>{post.title}</h3>
                  <p>{post.content}</p>
                </div>
                {(currentUser && currentUser.uid === post.authorId) || isAdmin ? (
                  <div className="button-group">
                    <button className="edit-button" onClick={() => handleEdit(post)}>수정</button>
                    <button className="delete-button" onClick={() => handleDelete(post.id)}>삭제</button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        ))
      )}
    </>
  );
};

export default PostList;