// src/pages/AdminPage.js
import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';

const AdminPage = () => {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [termsContent, setTermsContent] = useState('');
  const [privacyContent, setPrivacyContent] = useState('');
  const [saving, setSaving] = useState(false);

  const currentUser = auth.currentUser;

  // 사용자 목록 불러오기
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersData);
      } catch (error) {
        console.error("사용자 목록 로드 오류:", error);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  // 약관 및 방침 불러오기
  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const termsSnap = await getDoc(doc(db, "policies", "terms"));
        const privacySnap = await getDoc(doc(db, "policies", "privacy"));
        if (termsSnap.exists()) setTermsContent(termsSnap.data().content || '');
        if (privacySnap.exists()) setPrivacyContent(privacySnap.data().content || '');
      } catch (error) {
        console.error("약관/방침 불러오기 오류:", error);
      }
    };
    fetchPolicies();
  }, []);

  const handleDisableUser = async (userId) => {
    if (currentUser && currentUser.uid === userId) {
      alert("자기 자신을 강퇴할 수 없습니다.");
      return;
    }
    const confirmDisable = window.confirm("정말로 이 회원을 비활성화(강퇴)하시겠습니까?");
    if (confirmDisable) {
      try {
        await updateDoc(doc(db, "users", userId), { isDisabled: true });
        setUsers(users.map(u => u.id === userId ? { ...u, isDisabled: true } : u));
        alert("회원이 비활성화 처리되었습니다.");
      } catch (error) {
        console.error("회원 비활성화 오류:", error);
      }
    }
  };

  const handleSavePolicies = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "policies", "terms"), { content: termsContent });
      await updateDoc(doc(db, "policies", "privacy"), { content: privacyContent });
      alert("약관 및 방침이 저장되었습니다.");
    } catch (error) {
      console.error("약관/방침 저장 오류:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <h2>관리자 페이지</h2>

      {/* 회원 관리 */}
      <section className="list-section">
        <h3>회원 관리</h3>
        {loadingUsers ? (
          <div>사용자 목록을 불러오는 중...</div>
        ) : (
          users.map(user => (
            <div key={user.id} className={`user-card ${user.isDisabled ? 'disabled' : ''}`}>
              <div className="user-card-info">
                <span className="user-card-name">{user.name}</span>
                <span className="user-card-email">{user.email}</span>
              </div>
              <div className="user-card-status">
                <span className={`status-badge ${user.isDisabled ? 'status-disabled' : 'status-active'}`}>
                  {user.isDisabled ? '비활성' : '활성'}
                </span>
              </div>
              <div className="user-card-actions">
                <button
                  className="disable-button"
                  onClick={() => handleDisableUser(user.id)}
                  disabled={user.isDisabled || (currentUser && currentUser.uid === user.id)}
                >
                  강퇴
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* 약관/방침 수정 */}
      <section className="policy-section">
        <h3>약관 및 개인정보처리방침 수정</h3>

        <label htmlFor="terms">📝 이용약관</label>
        <textarea
          id="terms"
          value={termsContent}
          onChange={(e) => setTermsContent(e.target.value)}
          rows={15}
          style={{ width: '100%', marginBottom: '1rem' }}
        />

        <label htmlFor="privacy">🔒 개인정보처리방침</label>
        <textarea
          id="privacy"
          value={privacyContent}
          onChange={(e) => setPrivacyContent(e.target.value)}
          rows={15}
          style={{ width: '100%', marginBottom: '1rem' }}
        />

        <button
          onClick={handleSavePolicies}
          disabled={saving}
          className="save-policy-button"
        >
          {saving ? '저장 중...' : '약관 및 방침 저장'}
        </button>
      </section>
    </div>
  );
};

export default AdminPage;