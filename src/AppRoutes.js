// AppRoutes.js
import { useState, useEffect } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { ADMIN_UIDS } from './config';

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
import MyMessagesPage from './pages/MyMessagesPage';
import MessagesPage from './pages/MessagesPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';

function AppRoutes() {
  const [user, setUser] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [globalFontSize, setGlobalFontSize] = useState('16px');
  const [isFontPanelOpen, setIsFontPanelOpen] = useState(false);

  const isAdmin = user && ADMIN_UIDS.includes(user.uid);
  const location = useLocation();
  const hideFontPanel = location.pathname === '/' && !user;

  useEffect(() => {
    const saved = localStorage.getItem('fontSize');
    if (saved) setGlobalFontSize(saved);
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = globalFontSize;
    localStorage.setItem('fontSize', globalFontSize);
  }, [globalFontSize]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserInfo({
            uid: currentUser.uid,
            email: currentUser.email,
            name: data.name || '',
            nickname: data.nickname || '',
            phone: data.phone || '',
          });
        } else {
          setUserInfo(null);
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
      alert('로그아웃 중 오류가 발생했습니다.');
      console.error('로그아웃 오류:', error);
    }
  };

  const handleProfileUpdate = (updatedInfo) => {
    setUserInfo((prev) => ({ ...prev, ...updatedInfo }));
  };

  if (loading) return <div>로딩 중...</div>;

  return (
    <div className="App">
      {!hideFontPanel && (
        <div style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          background: '#fff',
          padding: '6px 10px',
          borderRadius: 8,
          boxShadow: '0 1px 5px rgba(0,0,0,0.1)',
          fontSize: '0.85rem',
          maxWidth: '160px',
          wordBreak: 'keep-all',
          lineHeight: '1.4',
        }}>
          <button onClick={() => setIsFontPanelOpen((prev) => !prev)}>
            {isFontPanelOpen ? '접기 ▲' : '글자크기 설정 ▼'}
          </button>
          {isFontPanelOpen && (
            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexDirection: 'column' }}>
              <button onClick={() => setGlobalFontSize('18px')}>글자 크게</button>
              <button onClick={() => setGlobalFontSize('16px')}>기본 크기</button>
            </div>
          )}
        </div>
      )}

      <a href="#main-content" className="skip-link" tabIndex={0}>본문 바로가기</a>

      <header className="app-header" role="banner">
        <div className="header-content">
          <h1><Link to="/">영중 행복마을</Link></h1>
          <nav className="desktop-nav" aria-label="주요 메뉴">
            {user && (
              <>
                <Link to="/notices">공지</Link>
                <Link to="/meetings">모임</Link>
                <Link to="/proposals">주민 제안</Link>
                <Link to="/chat">채팅</Link>
                <Link to="/mypage">마이페이지</Link>
                <Link to="/inquiries">문의사항</Link>
                <Link to="/messages">쪽지함</Link>
                {isAdmin && <Link to="/admin">관리자</Link>}
              </>
            )}
          </nav>
          {user && (
            <div className="user-info">
              <span>환영합니다, {userInfo?.nickname || userInfo?.name || user?.email} 님!</span>
              <button onClick={handleLogout}>로그아웃</button>
              <button className="mobile-nav-toggle" onClick={() => setIsNavOpen(!isNavOpen)}>
                {isNavOpen ? '✕' : '☰'}
              </button>
            </div>
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
              <Link to="/messages" onClick={() => setIsNavOpen(false)}>쪽지함</Link>
              {isAdmin && <Link to="/admin" onClick={() => setIsNavOpen(false)}>관리자</Link>}
              <button onClick={handleLogout}>로그아웃</button>
            </>
          )}
        </nav>
      )}

      <main id="main-content" tabIndex={-1}>
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
              <Route path="/messages" element={<MessagesPage userInfo={userInfo} />} />
              <Route path="/my-messages" element={<MyMessagesPage />} />
              <Route path="/inquiries" element={<InquiriesPage userInfo={userInfo} isAdmin={isAdmin} />} />
              {isAdmin && <Route path="/admin" element={<AdminPage />} />}
            </>
          ) : (
            <Route path="/" element={<Auth globalFontSize={globalFontSize} />} />
          )}
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      <footer className="app-footer" style={{ textAlign: 'center', padding: '1rem 0', fontSize: '0.85rem' }}>
        <p>
          <Link to="/terms" target="_blank" rel="noopener noreferrer">이용약관</Link> |{' '}
          <Link to="/privacy" target="_blank" rel="noopener noreferrer">개인정보처리방침</Link>
        </p>
      </footer>
    </div>
  );
}

export default AppRoutes;