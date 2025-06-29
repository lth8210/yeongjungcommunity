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
} from 'firebase/firestore';

const MeetingBoard = ({ meetingId, userInfo }) => {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!meetingId) return;
    const q = query(collection(db, 'meetings', meetingId, 'board'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPosts(postsData);
    }, (error) => {
      console.error('게시판 로드 오류:', error);
    });
    return () => unsubscribe();
  }, [meetingId]);

  const handleAddPost = async (e) => {
    e.preventDefault();
    if (!newPost.trim() || !userInfo) return;

    try {
      await addDoc(collection(db, 'meetings', meetingId, 'board'), {
        text: newPost.trim(),
        createdAt: serverTimestamp(),
        authorId: userInfo.uid,
        authorName: userInfo.name || userInfo.nickname || userInfo.email,
      });
      setNewPost('');
    } catch (error) {
      console.error('게시글 추가 오류:', error);
      alert('게시글 작성에 실패했습니다.');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('정말로 이 글을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'meetings', meetingId, 'board', postId));
    } catch (error) {
      console.error('게시글 삭제 오류:', error);
      alert('게시글 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="meeting-board" style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8, marginTop: 16 }}>
      <h3>모임 게시판</h3>
      <div className="board-post-list" style={{ marginBottom: 16 }}>
        {posts.length === 0 ? (
          <p style={{ color: '#666', textAlign: 'center' }}>아직 게시글이 없습니다. 첫 게시글을 작성해보세요!</p>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className="board-post-item"
              style={{ borderBottom: '1px solid #eee', padding: '8px 0', position: 'relative' }}
            >
              <div className="post-meta" style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>
                <strong>{post.authorName}</strong>
                <span style={{ marginLeft: 8 }}>
                  {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString('ko-KR') : '시간 정보 없음'}
                </span>
              </div>
              <p style={{ margin: '4px 0' }}>{post.text}</p>
              {currentUser && currentUser.uid === post.authorId && (
                <button
                  className="delete-post-button"
                  onClick={() => handleDeletePost(post.id)}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    padding: '2px 8px',
                    background: '#dc3545',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  삭제
                </button>
              )}
            </div>
          ))
        )}
      </div>
      <form onSubmit={handleAddPost} className="board-form" style={{ display: 'flex', gap: 8 }}>
        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="모임 구성원들과 이야기를 나눠보세요."
          style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #ccc', minHeight: 60 }}
        />
        <button
          type="submit"
          style={{
            padding: '8px 16px',
            background: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
          disabled={!newPost.trim()}
        >
          글쓰기
        </button>
      </form>
    </div>
  );
};

export default MeetingBoard;