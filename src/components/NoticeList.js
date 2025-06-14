// src/components/NoticeList.js

import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { ADMIN_UIDS } from '../config';
import { collection, query, orderBy, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";

const NoticeList = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState(null);
  const [updatedTitle, setUpdatedTitle] = useState('');
  const [updatedContent, setUpdatedContent] = useState('');
  
  const currentUser = auth.currentUser;
  const isAdmin = currentUser && ADMIN_UIDS.includes(currentUser.uid);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const noticesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setNotices(noticesData);
      } catch (error) {
        console.error("공지 목록 불러오기 오류: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchNotices();
  }, []);
  
  // 수정, 삭제 등 핸들러 함수들은 PostList.js, MeetingList.js와 원리가 동일합니다.
  const handleDelete = async (id) => {
    if (window.confirm("정말로 이 공지를 삭제하시겠습니까?")) {
      await deleteDoc(doc(db, "notices", id));
      setNotices(notices.filter(n => n.id !== id));
    }
  };
  
  const handleSave = async (id) => {
    await updateDoc(doc(db, "notices", id), {
      title: updatedTitle,
      content: updatedContent,
    });
    setEditingId(null);
    // 상태 직접 업데이트
    setNotices(notices.map(n => n.id === id ? { ...n, title: updatedTitle, content: updatedContent } : n));
  };
  
  const handleEdit = (notice) => {
    setEditingId(notice.id);
    setUpdatedTitle(notice.title);
    setUpdatedContent(notice.content);
  };

  return (
    <div className="notice-list">
      <h3>전체 공지</h3>
      {loading && <div>목록을 불러오는 중...</div>}
      
      {notices.map(notice => (
        <div key={notice.id} className="notice-item">
          {editingId === notice.id && isAdmin ? (
            // 수정 모드
            <div className="edit-form">
              <input type="text" value={updatedTitle} onChange={e => setUpdatedTitle(e.target.value)} />
              <textarea value={updatedContent} onChange={e => setUpdatedContent(e.target.value)}></textarea>
              <div className="button-group">
                <button onClick={() => handleSave(notice.id)}>저장</button>
                <button onClick={() => setEditingId(null)}>취소</button>
              </div>
            </div>
          ) : (
            // 일반 모드
            <>
              <h4>{notice.title}</h4>
              <p>{notice.content}</p>
              <small>작성자: {notice.authorName}</small>
              {isAdmin && (
                <div className="admin-actions">
                  <button className="edit-button" onClick={() => handleEdit(notice)}>수정</button>
                  <button className="delete-button" onClick={() => handleDelete(notice.id)}>삭제</button>
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default NoticeList;