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
  arrayUnion,
  arrayRemove,
  deleteDoc,
} from "firebase/firestore";
import CommunityCard from './CommunityCard';
import MessageModal from './MessageModal';
import ChatModal from './ChatModal';

const CATEGORY_LABELS = {
  environment: '환경',
  welfare: '복지',
  event: '행사',
  etc: '기타',
};

const STATUS_LABELS = {
  pending: '검토중',
  approved: '채택',
  rejected: '반려',
  done: '완료',
};

const ProposalList = ({ userInfo }) => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersMap, setUsersMap] = useState({});
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [isEditing, setIsEditing] = useState(null); // 현재 편집 중인 제안 ID
  const [editedProposal, setEditedProposal] = useState({}); // 편집 중인 제안 데이터

  const currentUser = auth.currentUser;
  const isAdmin = currentUser && ADMIN_UIDS.includes(currentUser.uid);

  useEffect(() => {
    const fetchProposals = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "proposals"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const proposalsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProposals(proposalsData);
      } catch (error) {
        console.error("제안 목록 불러오기 오류: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProposals();
  }, []);

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

  const getApplicantObjects = (uids) =>
    (uids || []).map(uid => ({ uid, nickname: usersMap[uid] || '닉네임없음' }));

  const handleAgree = async (proposalId) => {
    if (!currentUser) return alert("로그인이 필요합니다.");
    try {
      await updateDoc(doc(db, "proposals", proposalId), {
        applicants: arrayUnion(currentUser.uid)
      });
      setProposals(proposals =>
        proposals.map(p =>
          p.id === proposalId
            ? { ...p, applicants: [...(p.applicants || []), currentUser.uid] }
            : p
        )
      );
      alert("동의가 완료되었습니다!");
    } catch (err) {
      alert("동의 중 오류가 발생했습니다.");
      console.error(err);
    }
  };

  const handleCancelAgree = async (proposalId) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "proposals", proposalId), {
        applicants: arrayRemove(currentUser.uid)
      });
      setProposals(proposals =>
        proposals.map(p =>
          p.id === proposalId
            ? { ...p, applicants: (p.applicants || []).filter(uid => uid !== currentUser.uid) }
            : p
        )
      );
      alert("동의가 취소되었습니다.");
    } catch (err) {
      alert("동의 취소 중 오류가 발생했습니다.");
      console.error(err);
    }
  };

  const handleStatusChange = async (proposalId, newStatus) => {
    if (!window.confirm(`정말로 이 제안을 '${STATUS_LABELS[newStatus]}' 상태로 변경하시겠습니까?`)) return;
    try {
      await updateDoc(doc(db, "proposals", proposalId), { status: newStatus });
      setProposals(proposals =>
        proposals.map(p =>
          p.id === proposalId
            ? { ...p, status: newStatus }
            : p
        )
      );
      alert("상태가 변경되었습니다.");
    } catch (err) {
      alert("상태 변경 중 오류가 발생했습니다.");
      console.error(err);
    }
  };

  const handleEdit = (proposal) => {
    setIsEditing(proposal.id);
    // category가 없을 경우 'etc' 기본값 부여
    setEditedProposal({ ...proposal, category: proposal.category || 'etc' });
  };

  const handleSave = async (proposalId) => {
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }
    const isAuthor = currentUser.uid === editedProposal.authorId;
    if (!isAuthor && !isAdmin) {
      alert('수정 권한이 없습니다.');
      return;
    }
    try {
      const proposalRef = doc(db, 'proposals', proposalId);
      await updateDoc(proposalRef, {
        title: editedProposal.title,
        content: editedProposal.content,
        // undefined 방지 위해 기본값 'etc' 지정
        category: editedProposal.category || 'etc',
      });
      setProposals(proposals =>
        proposals.map(p =>
          p.id === proposalId ? { ...p, ...editedProposal, category: editedProposal.category || 'etc' } : p
        )
      );
      setIsEditing(null);
      setEditedProposal({});
      alert('제안이 수정되었습니다.');
    } catch (error) {
      console.error('제안 수정 실패:', error);
      alert('제안 수정 중 오류가 발생했습니다.');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(null);
    setEditedProposal({});
  };

  const handleDelete = async (proposalId) => {
    if (!window.confirm("정말로 이 제안을 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, "proposals", proposalId));
      setProposals(proposals.filter(p => p.id !== proposalId));
      alert("제안이 삭제되었습니다.");
    } catch (err) {
      alert("삭제 중 오류가 발생했습니다.");
      console.error(err);
    }
  };

  const openMessageModal = (userObj) => {
    setTargetUser(userObj);
    setMessageModalOpen(true);
  };
  const openChatModal = (userObj) => {
    setTargetUser(userObj);
    setChatModalOpen(true);
  };
  const closeMessageModal = () => setMessageModalOpen(false);
  const closeChatModal = () => setChatModalOpen(false);

  if (loading) return <div>제안 목록을 불러오는 중...</div>;

  return (
  <div>
    {proposals.length === 0 ? (
      <div className="empty-message-card">
        <p>아직 등록된 제안이 없습니다. 첫 제안을 남겨보세요!</p>
      </div>
    ) : (
      proposals.map(proposal => {
        const isApplicant = (proposal.applicants || []).includes(currentUser?.uid);
        const isAuthor = currentUser && currentUser.uid === proposal.authorId;
        const canEdit = isAuthor || isAdmin;
        const editing = isEditing === proposal.id;
        const applicants = getApplicantObjects(proposal.applicants);

        // 버튼 노출 조건 분리
        const showApprove = isAdmin && proposal.status === 'pending';
        const showReject = isAdmin && proposal.status === 'approved';

        return (
          <CommunityCard
            key={proposal.id}
            id={proposal.id}
            title={editing ? (
              <input
                value={editedProposal.title || ''}
                onChange={(e) => setEditedProposal({ ...editedProposal, title: e.target.value })}
                style={{ width: '100%', padding: 6, borderRadius: 4, border: '1px solid #ccc', fontSize: 16 }}
              />
            ) : proposal.title}
            content={editing ? (
              <textarea
                value={editedProposal.content || ''}
                onChange={(e) => setEditedProposal({ ...editedProposal, content: e.target.value })}
                style={{ width: '100%', minHeight: 80, padding: 6, borderRadius: 4, border: '1px solid #ccc', fontSize: 16 }}
              />
            ) : proposal.content}
            category={editing ? (
              <select
                value={editedProposal.category || 'etc'}
                onChange={(e) => setEditedProposal({ ...editedProposal, category: e.target.value })}
                style={{ width: '100%', padding: 6, borderRadius: 4, border: '1px solid #ccc', fontSize: 16 }}
              >
                {Object.keys(CATEGORY_LABELS).map((key) => (
                  <option key={key} value={key}>{CATEGORY_LABELS[key]}</option>
                ))}
              </select>
            ) : CATEGORY_LABELS[proposal.category] || '기타'}
            status={proposal.status}
            applicants={applicants}
            authorName={proposal.authorName}
            currentUser={userInfo}
            onApply={() => handleAgree(proposal.id)}
            onCancelApply={() => handleCancelAgree(proposal.id)}
            onComplete={() => handleStatusChange(proposal.id, 'done')}
            onEdit={() => handleEdit(proposal)}
            onDelete={() => handleDelete(proposal.id)}
            onMessage={openMessageModal}
            onChat={openChatModal}
            isApplicant={isApplicant}
            isAuthor={isAuthor}
            isAdmin={isAdmin}
            thumbnail={proposal.files && proposal.files.length > 0 ? proposal.files[0].url : null}
            isProposal={true}
            extraFields={
              <div style={{ color: '#666', fontSize: 15, marginBottom: 4 }}>
                동의수: {applicants.length}명
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  {showApprove && (
                    <button
                      onClick={() => handleStatusChange(proposal.id, 'approved')}
                      style={{
                        padding: '8px 16px',
                        background: '#1976d2',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 16,
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      채택
                    </button>
                  )}
                  {showReject && (
                    <button
                      onClick={() => handleStatusChange(proposal.id, 'rejected')}
                      style={{
                        padding: '8px 16px',
                        background: '#dc3545',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 16,
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      반려
                    </button>
                  )}
                </div>
                {canEdit && editing && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleSave(proposal.id)}
                      style={{ padding: '8px 16px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4 }}
                    >
                      저장
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      style={{ padding: '8px 16px', background: '#ccc', border: 'none', borderRadius: 4 }}
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>
            }
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

export default ProposalList;