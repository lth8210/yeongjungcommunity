import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const ProposalDetail = ({ userInfo }) => {
  const { proposalId } = useParams();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        const docRef = doc(db, 'proposals', proposalId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() };
          setProposal(data);
          setEditTitle(data.title || '');
          setEditContent(data.content || '');
        } else {
          setProposal(null);
        }
      } catch (error) {
        console.error('제안 정보 로드 오류:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProposal();
  }, [proposalId]);

  const handleSaveEdit = async () => {
    try {
      if (!proposalId) throw new Error('제안 ID가 유효하지 않습니다.');
      await updateDoc(doc(db, 'proposals', proposalId), {
        title: editTitle,
        content: editContent,
      });
      setProposal((p) => ({
        ...p,
        title: editTitle,
        content: editContent,
      }));
      setIsEditing(false);
      alert('제안이 수정되었습니다!');
    } catch (e) {
      console.error('수정 실패:', e);
      alert(`수정 실패: ${e.message}. 다시 시도해 주세요.`);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 20 }}>로딩 중...</div>;
  if (!proposal) return <div style={{ textAlign: 'center', padding: 20 }}>제안을 찾을 수 없습니다. <Link to="/proposals">목록으로 돌아가기</Link></div>;

  const isAuthor = userInfo && userInfo.uid === proposal.creatorId;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 16 }}>
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
            />
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc', minHeight: 80 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSaveEdit} style={{ padding: '8px 16px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                저장
              </button>
              <button onClick={() => setIsEditing(false)} style={{ padding: '8px 16px', background: '#ccc', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                취소
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 style={{ margin: '8px 0' }}>{proposal.title}</h2>
            <p style={{ marginBottom: 8 }}>{proposal.content}</p>
            {isAuthor && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                style={{ padding: '8px 16px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              >
                수정
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProposalDetail;