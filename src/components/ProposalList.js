// src/components/ProposalList.js

import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, orderBy, getDocs, updateDoc, doc, arrayUnion, arrayRemove, addDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { ADMIN_UIDS } from '../config';

const CommentSection = ({ proposalId, userInfo }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");

    useEffect(() => {
        let isMounted = true;
        const q = query(collection(db, "proposals", proposalId, "comments"), orderBy("createdAt"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (isMounted) {
                const commentsData = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
                setComments(commentsData);
            }
        });
        return () => { 
            isMounted = false;
            unsubscribe();
        };
    }, [proposalId]);

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (newComment.trim() === "" || !userInfo) return;
        await addDoc(collection(db, "proposals", proposalId, "comments"), {
            text: newComment,
            authorName: userInfo.name,
            authorId: userInfo.uid,
            createdAt: serverTimestamp()
        });
        setNewComment("");
    };

    return (
        <div className="comment-section">
            <div className="comment-list">
                {comments.length > 0 ? comments.map(comment => (
                    <div key={comment.id} className="comment-item">
                        <strong>{comment.authorName}:</strong> <span>{comment.text}</span>
                    </div>
                )) : <p className="empty-message small">아직 댓글이 없습니다.</p>}
            </div>
            <form onSubmit={handleAddComment} className="comment-form">
                <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="댓글 달기..." />
                <button type="submit">등록</button>
            </form>
        </div>
    );
};


const ProposalList = ({ userInfo }) => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState({});
  
  const currentUser = auth.currentUser;
  const isAdmin = currentUser && ADMIN_UIDS.includes(currentUser.uid);

  useEffect(() => {
    const fetchProposals = async () => {
      setLoading(true); // 로딩 시작을 명확히 함
      try {
        const q = query(collection(db, "proposals"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const proposalsData = querySnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            // 댓글 수를 미리 가져오는 것은 복잡하므로, 우선 UI에서만 처리
        }));
        setProposals(proposalsData);
      } catch (error) {
        console.error("제안 목록 불러오기 중 오류: ", error);
      } finally {
        setLoading(false); // 성공하든 실패하든 로딩을 종료
      }
    };
    fetchProposals();
  }, []); // key prop이 바뀌면 새로 마운트되므로 의존성 배열은 비워둠

  const handleUpdateStatus = async (id, newStatus) => {
    const confirmAction = window.confirm(`정말로 이 제안을 '${newStatus === 'approved' ? '승인' : '반려'}' 상태로 변경하시겠습니까?`);
    if (confirmAction) {
      try {
        await updateDoc(doc(db, "proposals", id), { status: newStatus });
        setProposals(proposals.map(p => p.id === id ? { ...p, status: newStatus } : p));
        alert("제안 상태가 변경되었습니다.");
      } catch (error) { console.error("상태 업데이트 중 오류:", error); }
    }
  };
  
  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return '검토 중';
      case 'approved': return '승인됨';
      case 'rejected': return '반려됨';
      default: return status;
    }
  };

  const handleToggleAgreement = async (proposalId, agreements) => {
    if (!currentUser) return;
    const proposalDoc = doc(db, "proposals", proposalId);
    const hasAgreed = agreements?.includes(currentUser.uid);
    try {
      await updateDoc(proposalDoc, {
        agreements: hasAgreed ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
      });
      setProposals(proposals.map(p => 
        p.id === proposalId 
          ? { ...p, agreements: hasAgreed ? p.agreements.filter(uid => uid !== currentUser.uid) : [...(p.agreements || []), currentUser.uid] } 
          : p
      ));
    } catch (error) { console.error("동의 처리 중 오류:", error); }
  };

  const toggleComments = (proposalId) => {
    setShowComments(prev => ({...prev, [proposalId]: !prev[proposalId]}));
  };

  if (loading) return <div>목록을 불러오는 중...</div>;

  return (
    <>
      {proposals.length === 0 ? (
        <div className="empty-message-card card">
          <p>아직 접수된 제안이 없습니다.</p>
        </div>
      ) : (
        proposals.map(proposal => {
          const hasAgreed = proposal.agreements?.includes(currentUser?.uid);
          return (
            <div key={proposal.id} className="proposal-item">
              <div className="proposal-main-content">
                <span className={`proposal-status status-${proposal.status}`}>{getStatusText(proposal.status)}</span>
                <h4>{proposal.title}</h4>
                <p>{proposal.content}</p>
                <small>제안자: {proposal.authorName}</small>
              </div>
              
              <div className="proposal-actions">
                {proposal.status === 'approved' && (
                  <div className="agreement-section">
                    <button className={`agree-button ${hasAgreed ? 'agreed' : ''}`} onClick={() => handleToggleAgreement(proposal.id, proposal.agreements)}>
                      👍 동의 {proposal.agreements?.length || 0}
                    </button>
                  </div>
                )}
                {isAdmin && (
                  <div className="admin-actions">
                    <button className="approve-button" onClick={() => handleUpdateStatus(proposal.id, 'approved')} disabled={proposal.status === 'approved'}>승인</button>
                    <button className="reject-button" onClick={() => handleUpdateStatus(proposal.id, 'rejected')} disabled={proposal.status === 'rejected'}>반려</button>
                  </div>
                )}
              </div>

              <div className="comment-toggle-area">
                <button className="comment-toggle-button" onClick={() => toggleComments(proposal.id)}>
                  댓글 {showComments[proposal.id] ? '숨기기' : '보기'}
                </button>
              </div>
              {showComments[proposal.id] && <CommentSection proposalId={proposal.id} userInfo={userInfo} />}
            </div>
          )
        })
      )}
    </>
  );
};

export default ProposalList;