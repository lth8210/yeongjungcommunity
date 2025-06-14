import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const InquiryList = ({ refreshKey, userInfo }) => {
  const [inquiries, setInquiries] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingContent, setEditingContent] = useState('');

  const fetchInquiries = async () => {
    const q = query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs
      .map(doc => {
        const docData = doc.data();
        return { id: doc.id, ...docData };
      })
      .filter(inquiry => inquiry.createdAt); // Ensure createdAt exists
    setInquiries(data);
  };

  useEffect(() => {
    fetchInquiries();
  }, [refreshKey]);

  useEffect(() => {
    if (editingId) {
      const textarea = document.querySelector(`#edit-${editingId}`);
      textarea?.focus();
    }
  }, [editingId]);

  const handleEdit = (id, content) => {
    setEditingId(id);
    setEditingContent(content);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingContent('');
  };

  const handleEditSave = async (id) => {
    try {
      await updateDoc(doc(db, 'inquiries', id), {
        content: editingContent,
        updatedAt: serverTimestamp()
      });
      setEditingId(null);
      setEditingContent('');
      fetchInquiries();
    } catch (err) {
      console.error('수정 실패:', err);
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말로 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'inquiries', id));
      fetchInquiries();
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="inquiry-list">
      {inquiries.length === 0 ? (
        <p>문의가 없습니다.</p>
      ) : (
        inquiries.map(inquiry => (
          <div key={inquiry.id} className="inquiry-item">
            {editingId === inquiry.id ? (
              <>
                <textarea
                  id={`edit-${inquiry.id}`}
                  placeholder="수정할 내용을 입력해주세요"
                  aria-label="문의 수정 입력란"
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                />
                <div className="inquiry-actions">
                  <button onClick={() => handleEditSave(inquiry.id)}>저장</button>
                  <button onClick={handleEditCancel}>취소</button>
                </div>
              </>
            ) : (
              <>
                <p>{inquiry.content}</p>
                <small>작성자: {inquiry.userName || '익명'}</small>
                {userInfo?.uid === inquiry.userId && (
                  <div className="inquiry-actions">
                    <button onClick={() => handleEdit(inquiry.id, inquiry.content)}>수정</button>
                    <button onClick={() => handleDelete(inquiry.id)}>삭제</button>
                  </div>
                )}
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default InquiryList;