// src/components/PostList.js

import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { ADMIN_UIDS } from '../config';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import MessageModal from './MessageModal';
import ChatModal from './ChatModal';

const CATEGORY_LABELS = {
  share: '이거 나눠요',
  together: '이거 함께해요',
  free: '자유글'
};

const PostList = ({ userInfo }) => {
  // 상태 정의
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [updatedTitle, setUpdatedTitle] = useState('');
  const [updatedContent, setUpdatedContent] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [usersMap, setUsersMap] = useState({});
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState(null);

  const currentUser = auth.currentUser;
  const isAdmin = currentUser && ADMIN_UIDS.includes(currentUser.uid);

  // 게시글 불러오기
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
  }, []);

  // 모든 유저 닉네임 매핑(usersMap) 불러오기
  useEffect(() => {
    const fetchUsersMap = async () => {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const map = {};
        usersSnap.docs.forEach(doc => {
          const data = doc.data();
          map[doc.id] = data.nickname || "닉네임없음";
        });
        setUsersMap(map);
      } catch (err) {
        console.error("유저 닉네임 불러오기 오류:", err);
      }
    };
    fetchUsersMap();
  }, []);

  // 글 삭제
  const handleDelete = async (id) => {
    if (window.confirm("정말로 이 글을 삭제하시겠습니까?")) {
      try {
        await deleteDoc(doc(db, "posts", id));
        setPosts(posts.filter(p => p.id !== id));
        alert("글이 삭제되었습니다.");
      } catch (error) {
        console.error("글 삭제 중 오류:", error);
        alert("글 삭제에 실패했습니다.");
      }
    }
  };

  // 글 수정
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
      setPosts(posts.map(p => p.id === id ? { ...p, title: updatedTitle, content: updatedContent } : p));
      setEditingId(null);
      alert("글이 수정되었습니다.");
    } catch (error) {
      console.error("글 수정 중 오류:", error);
      alert("글 수정에 실패했습니다.");
    }
  };

  // 글 수정 시작/취소
  const handleEdit = (post) => {
    setEditingId(post.id);
    setUpdatedTitle(post.title);
    setUpdatedContent(post.content);
  };
  const handleCancel = () => setEditingId(null);

  // 참여하기
  const handleApply = async (postId) => {
    if (!currentUser) return alert("로그인이 필요합니다.");
    try {
      await updateDoc(doc(db, "posts", postId), {
        applicants: arrayUnion(currentUser.uid)
      });
      setPosts(posts =>
        posts.map(p =>
          p.id === postId
            ? { ...p, applicants: [...(p.applicants || []), currentUser.uid] }
            : p
        )
      );
      alert("참여 신청이 완료되었습니다!");
    } catch (err) {
      alert("참여 신청 중 오류가 발생했습니다.");
      console.error(err);
    }
  };

  // 참여 취소
  const handleCancelApply = async (postId) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "posts", postId), {
        applicants: arrayRemove(currentUser.uid)
      });
      setPosts(posts =>
        posts.map(p =>
          p.id === postId
            ? { ...p, applicants: (p.applicants || []).filter(uid => uid !== currentUser.uid) }
            : p
        )
      );
      alert("참여가 취소되었습니다.");
    } catch (err) {
      alert("참여 취소 중 오류가 발생했습니다.");
      console.error(err);
    }
  };

  // 완료 처리
  const handleComplete = async (postId) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "posts", postId), { status: "done" });
      setPosts(posts =>
        posts.map(p =>
          p.id === postId
            ? { ...p, status: "done" }
            : p
        )
      );
      alert("글이 완료 처리되었습니다.");
    } catch (err) {
      alert("완료 처리 중 오류가 발생했습니다.");
      console.error(err);
    }
  };

  // 쪽지/채팅 모달 열기/닫기
  const openMessageModal = (uid, nickname) => {
    setTargetUser({ uid, nickname });
    setMessageModalOpen(true);
  };
  const openChatModal = (uid, nickname) => {
    setTargetUser({ uid, nickname });
    setChatModalOpen(true);
  };
  const closeMessageModal = () => setMessageModalOpen(false);
  const closeChatModal = () => setChatModalOpen(false);

  // 카테고리 필터링
  const filteredPosts = filterCategory === 'all'
    ? posts
    : posts.filter(post => post.category === filterCategory);

  if (loading) return <div>목록을 불러오는 중...</div>;

  return (
    <div>
      {/* 카테고리 필터 버튼 */}
      <div className="category-filter" style={{ marginBottom: '16px' }}>
        <button onClick={() => setFilterCategory('all')} style={{ marginRight: 8 }}>전체</button>
        <button onClick={() => setFilterCategory('share')} style={{ marginRight: 8 }}>이거 나눠요</button>
        <button onClick={() => setFilterCategory('together')} style={{ marginRight: 8 }}>이거 함께해요</button>
        <button onClick={() => setFilterCategory('free')}>자유글</button>
      </div>

      {/* 게시글 목록 */}
      {filteredPosts.length === 0 ? (
        <div className="empty-message-card">
          <p>아직 작성된 글이 없습니다. 첫 글을 작성해보세요!</p>
        </div>
      ) : (
        filteredPosts.map(post => {
          const isApplicant = post.applicants?.includes(currentUser?.uid);
          const isAuthor = currentUser && currentUser.uid === post.authorId;
          const isDone = post.status === 'done';

          return (
            <div key={post.id} className="post-item" style={{ border: '1px solid #ddd', borderRadius: 8, marginBottom: 20, padding: 16, background: isDone ? '#f8f9fa' : '#fff' }}>
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
                  {/* 카테고리/상태/참여중 뱃지/작성자/타이틀 */}
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4, gap: 8 }}>
                    <span style={{
                      fontWeight: 700,
                      color: '#0d6efd',
                      background: '#e7f1ff',
                      borderRadius: 12,
                      padding: '2px 10px',
                      fontSize: 13,
                      marginRight: 4
                    }}>
                      {CATEGORY_LABELS[post.category] || '카테고리 없음'}
                    </span>
                    <span style={{
                      background: isDone ? '#adb5bd' : '#51cf66',
                      color: '#fff',
                      borderRadius: 12,
                      padding: '2px 12px',
                      fontSize: 13,
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      {isDone ? '✔ 완료됨' : '⏳ 진행중'}
                    </span>
                    {isApplicant && !isAuthor && !isDone && (
                      <span style={{
                        background: '#ffd43b',
                        color: '#333',
                        borderRadius: 12,
                        padding: '2px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}>
                        🙋 참여중
                      </span>
                    )}
                    <small className="author-name" style={{ color: '#888', marginLeft: 'auto' }}>
                      {post.authorName}
                    </small>
                  </div>
                  <h3 style={{ margin: '6px 0' }}>{post.title}</h3>
                  <p style={{ marginBottom: 8 }}>{post.content}</p>

                  {/* 신청자 명단 (닉네임+쪽지/채팅/참여취소 버튼) */}
                  {post.applicants && post.applicants.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <strong>신청자:</strong>
                      <ul style={{ display: 'inline', marginLeft: 8, padding: 0 }}>
                        {post.applicants.map((uid, idx) => (
                          <li key={uid} style={{ display: 'inline', marginRight: 8 }}>
                            <span style={{ background: '#f1f3f5', borderRadius: 6, padding: '2px 8px' }}>
                              {usersMap[uid] || '닉네임없음'}
                            </span>
                            {/* 쪽지/채팅 버튼: 본인 제외 */}
                            {uid !== currentUser?.uid && (
                              <>
                                <button
                                  style={{ marginLeft: 4, fontSize: 12, padding: '2px 6px', background: '#e3fafc', color: '#228be6', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                                  onClick={() => openMessageModal(uid, usersMap[uid])}
                                  aria-label="쪽지 보내기"
                                >
                                  쪽지
                                </button>
                                <button
                                  style={{ marginLeft: 2, fontSize: 12, padding: '2px 6px', background: '#fff3bf', color: '#f59f00', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                                  onClick={() => openChatModal(uid, usersMap[uid])}
                                  aria-label="채팅하기"
                                >
                                  채팅
                                </button>
                              </>
                            )}
                            {/* 참여 취소 버튼: 본인만 */}
                            {uid === currentUser?.uid && (
                              <button
                                style={{ marginLeft: 4, fontSize: 12, padding: '2px 6px', background: '#ffe3e3', color: '#d9534f', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                                onClick={() => handleCancelApply(post.id)}
                                aria-label="참여 취소"
                              >
                                참여 취소
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 버튼 영역 */}
                  <div className="button-group" style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    {/* 참여하기: 글쓴이 아니고, 완료 아니고, 이미 신청 안 했을 때만 */}
                    {!isAuthor && !isDone && !isApplicant && (
                      <button
                        className="apply-button"
                        style={{ background: '#51cf66', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 18px', fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => handleApply(post.id)}
                      >
                        + 참여하기
                      </button>
                    )}
                    {/* 완료 버튼: 글쓴이만, 완료 아니면 */}
                    {isAuthor && !isDone && (
                      <button
                        className="complete-button"
                        style={{ background: '#adb5bd', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 18px', fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => handleComplete(post.id)}
                      >
                        ✔ 완료
                      </button>
                    )}
                    {/* 수정/삭제: 글쓴이 또는 관리자 */}
                    {(isAuthor || isAdmin) && (
                      <>
                        <button
                          className="edit-button"
                          style={{ background: '#e7f5ff', color: '#1971c2', border: 'none', borderRadius: 8, padding: '6px 14px', fontWeight: 600, cursor: 'pointer' }}
                          onClick={() => handleEdit(post)}
                        >
                          수정
                        </button>
                        <button
                          className="delete-button"
                          style={{ background: '#ffe3e3', color: '#d9534f', border: 'none', borderRadius: 8, padding: '6px 14px', fontWeight: 600, cursor: 'pointer' }}
                          onClick={() => handleDelete(post.id)}
                        >
                          삭제
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })
      )}

      {/* 쪽지/채팅 모달 */}
      {messageModalOpen && targetUser && (
        <MessageModal
          open={messageModalOpen}
          onClose={closeMessageModal}
          fromUser={userInfo}
          toUser={{ uid: targetUser.uid, nickname: targetUser.nickname }}
        />
      )}
      {chatModalOpen && targetUser && (
        <ChatModal
          open={chatModalOpen}
          onClose={closeChatModal}
          fromUser={userInfo}
          toUser={{ uid: targetUser.uid, nickname: targetUser.nickname }}
        />
      )}
    </div>
  );
};

export default PostList;