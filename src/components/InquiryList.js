import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { ADMIN_UIDS } from '../config';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import { useNavigate } from 'react-router-dom';
import CommunityCard from './CommunityCard';
import MessageModal from './MessageModal';
import ChatModal from './ChatModal';

const InquiryList = ({ userInfo, isAdmin }) => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersMap, setUsersMap] = useState({});
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [isEditing, setIsEditing] = useState(null);
  const [editedInquiry, setEditedInquiry] = useState({});
  const navigate = useNavigate();

  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchInquiries = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "inquiries"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const inquiriesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setInquiries(inquiriesData);
      } catch (error) {
        console.error("문의 목록 불러오기 오류: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInquiries();
  }, []);

  useEffect(() => {
    const fetchUsersMap = async () => {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const map = {};
        usersSnap.docs.forEach((doc) => {
          const data = doc.data();
          map[doc.id] = { nickname: data.nickname || "닉네임없음", name: data.name || "" };
        });
        setUsersMap(map);
      } catch (err) {
        console.error("유저 닉네임 불러오기 오류:", err);
      }
    };
    fetchUsersMap();
  }, []);

  const handleDelete = async (inquiryId) => {
    if (!window.confirm("정말로 이 문의를 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, "inquiries", inquiryId));
      setInquiries(inquiries.filter(i => i.id !== inquiryId));
      alert("문의가 삭제되었습니다.");
    } catch (err) {
      alert("삭제 중 오류가 발생했습니다.");
      console.error(err);
    }
  };

  const handleReply = async (inquiryId, reply) => {
    try {
      await updateDoc(doc(db, "inquiries", inquiryId), {
        reply,
        status: 'answered'
      });
      setInquiries(inquiries =>
        inquiries.map(i =>
          i.id === inquiryId
            ? { ...i, reply, status: 'answered' }
            : i
        )
      );
      setReplyDrafts(drafts => ({ ...drafts, [inquiryId]: reply }));
      alert("답변 저장되었습니다.");
    } catch (err) {
      alert("답변 저장 중 오류가 발생했습니다.");
      console.error(err);
    }
  };

  const handleEdit = (inquiry) => {
    setIsEditing(inquiry.id);
    setEditedInquiry({ ...inquiry });
  };

  const handleSave = async (inquiryId) => {
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }
    const isAuthor = currentUser.uid === editedInquiry.userId;
    if (!isAuthor && !isAdmin) {
      alert('수정 권한이 없습니다.');
      return;
    }
    try {
      const inquiryRef = doc(db, 'inquiries', inquiryId);
      await updateDoc(inquiryRef, {
        title: editedInquiry.title,
        content: editedInquiry.content,
      });
      setInquiries(inquiries =>
        inquiries.map(i =>
          i.id === inquiryId ? { ...i, title: editedInquiry.title, content: editedInquiry.content } : i
        )
      );
      setIsEditing(null);
      setEditedInquiry({});
      alert('문의가 수정되었습니다.');
    } catch (error) {
      console.error('문의 수정 실패:', error);
      alert('문의 수정 중 오류가 발생했습니다.');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(null);
    setEditedInquiry({});
  };

  const openMessageModal = (userObj) => {
    if (!userObj || !userObj.uid) return;
    setTargetUser(userObj);
    setMessageModalOpen(true);
  };

  const openChatModal = (userObj) => {
    if (!userObj || !userObj.uid) return;
    setTargetUser(userObj);
    setChatModalOpen(true);
  };

  const closeMessageModal = () => setMessageModalOpen(false);
  const closeChatModal = () => setChatModalOpen(false);

  const handleInquiryClick = (id) => {
    navigate(`/inquiry/${id}`);
  };

  if (loading) return <div>문의 목록을 불러오는 중...</div>;

  const visibleInquiries = isAdmin
    ? inquiries
    : inquiries.filter(i => !i.isPrivate || i.userId === currentUser?.uid);

  return (
    <div>
      {visibleInquiries.length === 0 ? (
        <div className="empty-message-card">
          <p>아직 등록된 문의가 없습니다.</p>
        </div>
      ) : (
        visibleInquiries.map(inquiry => {
          const isAuthor = currentUser && currentUser.uid === inquiry.userId;
          const canEdit = isAuthor || isAdmin;
          const editing = isEditing === inquiry.id;
          return (
            <CommunityCard
              key={inquiry.id}
              id={inquiry.id}
              title={editing ? (
                <input
                  value={editedInquiry.title || ''}
                  onChange={(e) => setEditedInquiry({ ...editedInquiry, title: e.target.value })}
                  style={{ width: '100%', padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
                />
              ) : `문의: ${inquiry.title || inquiry.content.slice(0, 20)}...`}
              content={editing ? (
                <textarea
                  value={editedInquiry.content || ''}
                  onChange={(e) => setEditedInquiry({ ...editedInquiry, content: e.target.value })}
                  style={{ width: '100%', minHeight: 80, padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
                />
              ) : (
                <div>
                  <div>{inquiry.content}</div>
                  {inquiry.files && inquiry.files.length > 0 && (
                    <div style={{ margin: '8px 0' }}>
                      <b>첨부파일:</b>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', gap: 8 }}>
                        {inquiry.files.map((file, idx) => (
                          <li key={idx}>
                            {file.type && file.type.startsWith('image/') ? (
                              <img
                                src={file.url}
                                alt={file.originalName}
                                style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, marginRight: 8 }}
                              />
                            ) : (
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#1976d2', textDecoration: 'underline' }}
                              >
                                {file.originalName}
                              </a>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              category="문의"
              status={inquiry.status || 'waiting'}
              authorName={usersMap[inquiry.userId]?.nickname || inquiry.userName || '익명'}
              authorId={inquiry.userId}
              usersMap={usersMap}
              currentUser={userInfo}
              onDelete={() => handleDelete(inquiry.id)}
              onMessage={() => openMessageModal({ uid: inquiry.userId, nickname: usersMap[inquiry.userId]?.nickname || inquiry.userName })}
              onChat={() => openChatModal({ uid: inquiry.userId, nickname: usersMap[inquiry.userId]?.nickname || inquiry.userName })}
              isAuthor={isAuthor}
              isAdmin={isAdmin}
              isInquiry={true} // 문의 카드임을 명확히 넘김
              extraFields={
                <div style={{ color: '#666', fontSize: 13, marginBottom: 4 }}>
                  {inquiry.reply && (
                    <div>
                      <strong>답변:</strong> {inquiry.reply}
                    </div>
                  )}
                  {isAdmin && !editing && (
                    <div>
                      <textarea
                        placeholder="답변 입력"
                        value={replyDrafts[inquiry.id] !== undefined ? replyDrafts[inquiry.id] : (inquiry.reply || '')}
                        onChange={e => setReplyDrafts(drafts => ({ ...drafts, [inquiry.id]: e.target.value }))}
                        onBlur={e => {
                          e.stopPropagation();
                          handleReply(inquiry.id, e.target.value);
                        }}
                        onClick={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                        style={{ width: '100%', minHeight: 40, marginTop: 4 }}
                      />
                    </div>
                  )}
                  {inquiry.isPrivate && (
                    <span style={{ color: '#dc3545', marginLeft: 8, fontWeight: 600 }}>
                      비공개 문의
                    </span>
                  )}
                  {canEdit && (
                    <div style={{ marginTop: 8 }}>
                      {editing ? (
                        <>
                          <button
                            onClick={() => handleSave(inquiry.id)}
                            style={{ padding: '4px 8px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, marginRight: 8 }}
                          >
                            저장
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            style={{ padding: '4px 8px', background: '#ccc', border: 'none', borderRadius: 4 }}
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleEdit(inquiry)}
                          style={{ padding: '4px 8px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4 }}
                        >
                          수정
                        </button>
                      )}
                    </div>
                  )}
                </div>
              }
              onClick={handleInquiryClick}
            />
          );
        })
      )}
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

export default InquiryList;