// src/pages/AdminPage.js

import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

const AdminPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersData);
      } catch (error) {
        console.error("사용자 목록 로드 오류:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
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
      } catch (error) { console.error("회원 비활성화 오류:", error); }
    }
  };

  if (loading) return <div className="loading-screen">사용자 목록을 불러오는 중...</div>;

  return (
    <div className="admin-page">
      <h2>회원 관리</h2>
      <div className="list-section">
        {users.map(user => (
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
        ))}
      </div>
    </div>
  );
};

export default AdminPage;