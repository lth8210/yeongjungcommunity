import './App.css';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { ADMIN_UIDS } from './config';

// 모든 페이지 컴포넌트 import
import Auth from './components/Auth';
import HomePage from './pages/HomePage';
import MyPage from './pages/MyPage';
import MeetingsPage from './pages/MeetingsPage';
import MeetingDetailPage from './pages/MeetingDetailPage';
import ProposalsPage from './pages/ProposalsPage';
import NoticesPage from './pages/NoticesPage';
import ChatListPage from './pages/ChatListPage';
import ChatRoomPage from './pages/ChatRoomPage';
import AdminPage from './pages/AdminPage';
import InquiriesPage from './pages/InquiriesPage';

function App() {
  const [user, setUser] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNavOpen, setIsNavOpen] = useState(false);

  const isAdmin = user && ADMIN_UIDS.includes(user.uid);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
  const userData = userDoc.data();
  setUserInfo({
    uid: currentUser.uid,
    email: currentUser.email,
    name: userData.name || '이름 없음',
    nickname: userData.nickname || '닉네임 없음',
    phone: userData.phone || '',
  });
} else {
  setUserInfo({
    uid: currentUser.uid,
    email: currentUser.email,
    name: '이름 없음',
    nickname: '닉네임 없음',
    phone: '',
  });
}
      } else {
        setUserInfo(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsNavOpen(false);
    } catch (error) {
      console.error("로그아웃 오류:", error);
    }
  };

  const handleProfileUpdate = (updatedInfo) => {
    setUserInfo(prev => ({ ...prev, ...updatedInfo }));
  };

  if (loading) {
    return <div className="loading-screen">로딩 중...</div>;
  }

  return (
    <Router>
      <div className="App">
        <header className="app-header">
          <div className="header-content">
            <h1><Link to="/">영중 행복마을</Link></h1>
            <nav className="desktop-nav">
              {user && <Link to="/notices">공지</Link>}
              {user && <Link to="/meetings">모임</Link>}
              {user && <Link to="/proposals">주민 제안</Link>}
              {user && <Link to="/chat">채팅</Link>}
              {user && <Link to="/mypage">마이페이지</Link>}
              {user && <Link to="/inquiries">문의사항</Link>}
              {isAdmin && <Link to="/admin" className="admin-link">관리자</Link>}
            </nav>
            {user && (
              <div className="user-info">
                <span>환영합니다, {userInfo?.nickname || userInfo?.name || user?.email} 님!</span>
                <button onClick={handleLogout} className="logout-button">로그아웃</button>
              </div>
            )}
            {user && (
              <button className="mobile-nav-toggle" onClick={() => setIsNavOpen(!isNavOpen)}>
                {isNavOpen ? '✕' : '☰'}
              </button>
            )}
          </div>
        </header>

        {isNavOpen && (
          <nav className="mobile-nav">
            {user && (
              <>
                <Link to="/notices" onClick={() => setIsNavOpen(false)}>공지</Link>
                <Link to="/meetings" onClick={() => setIsNavOpen(false)}>모임</Link>
                <Link to="/proposals" onClick={() => setIsNavOpen(false)}>주민 제안</Link>
                <Link to="/chat" onClick={() => setIsNavOpen(false)}>채팅</Link>
                <Link to="/mypage" onClick={() => setIsNavOpen(false)}>마이페이지</Link>
                <Link to="/inquiries" onClick={() => setIsNavOpen(false)}>문의사항</Link>
                {isAdmin && (
                  <Link to="/admin" className="admin-link" onClick={() => setIsNavOpen(false)}>관리자</Link>
                )}
                <button onClick={handleLogout} className="logout-button mobile-logout">로그아웃</button>
              </>
            )}
          </nav>
        )}

        <main>
          <Routes>
            {user ? (
              <>
                <Route path="/" element={<HomePage userInfo={userInfo} />} />
                <Route path="/notices" element={<NoticesPage userInfo={userInfo} />} />
                <Route path="/meetings" element={<MeetingsPage userInfo={userInfo} />} />
                <Route path="/meeting/:meetingId" element={<MeetingDetailPage userInfo={userInfo} />} />
                <Route path="/proposals" element={<ProposalsPage userInfo={userInfo} />} />
                <Route path="/chat" element={<ChatListPage userInfo={userInfo} />} />
                <Route path="/chat/:roomId" element={<ChatRoomPage userInfo={userInfo} />} />
                <Route path="/mypage" element={<MyPage userInfo={userInfo} onProfileUpdate={handleProfileUpdate} />} />
                <Route path="/inquiries" element={<InquiriesPage userInfo={userInfo} />} />
                {isAdmin && <Route path="/admin" element={<AdminPage />} />}
                <Route path="*" element={<Navigate to="/" />} />
              </>
            ) : (
              <>
                <Route path="/" element={<Auth />} />
                <Route path="*" element={<Navigate to="/" />} />
              </>
            )}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;