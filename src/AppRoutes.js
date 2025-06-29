import { useState, useEffect, useRef } from 'react';
import { Routes, Route, NavLink, Link, Navigate, useLocation } from 'react-router-dom';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ADMIN_UIDS } from './config';
import { requestFcmToken } from './firebase';

import Auth from './components/Auth';
import HomePage from './pages/HomePage';
import MyPage from './pages/MyPage';
import MeetingsPage from './pages/MeetingsPage';
import MeetingDetailPage from './pages/MeetingDetailPage';
import ProposalsPage from './pages/ProposalsPage';
import ProposalDetail from './pages/ProposalDetail';
import NoticesPage from './pages/NoticesPage';
import ChatListPage from './pages/ChatListPage';
import ChatRoomPage from './pages/ChatRoomPage';
import AdminPage from './pages/AdminPage';
import InquiriesPage from './pages/InquiriesPage';
import MyMessagesPage from './pages/MyMessagesPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import OpenChatRoomForm from './components/OpenChatRoomForm';
import OpenChatRoomList from './components/OpenChatRoomList';
import OpenChatPage from './pages/OpenChatPage';
import InquiryDetail from './pages/InquiryDetail'; // 추가

const menuItemStyle = {
  padding: '0 18px',
  fontSize: '1rem',
  height: 44,
  lineHeight: '44px',
  color: '#222',
  textAlign: 'center',
  textDecoration: 'none',
  fontWeight: 600,
  background: 'none',
  border: 'none',
  outline: 'none',
  borderRadius: 6,
  transition: 'background 0.15s, color 0.15s',
  cursor: 'pointer',
  display: 'inline-block',
  margin: '0 2px',
};

const menuItemActiveStyle = {
  ...menuItemStyle,
  background: '#eaf4ff',
  color: '#1976d2',
  outline: '2px solid #1976d2',
};

const logoutBtnStyle = {
  ...menuItemStyle,
  background: '#1976d2',
  color: '#fff',
  fontWeight: 700,
  marginLeft: 12,
  border: 'none',
  outline: 'none',
  boxShadow: '0 1px 4px rgba(25,118,210,0.05)',
  transition: 'background 0.18s, color 0.18s',
};

const logoutBtnHoverStyle = {
  ...logoutBtnStyle,
  background: '#115293',
};

function getDefaultFontSize() {
  return window.innerWidth < 768 ? '17px' : '16px';
}

function AppRoutes() {
  const [user, setUser] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [globalFontSize, setGlobalFontSize] = useState(getDefaultFontSize());
  const [isFontPanelOpen, setIsFontPanelOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [logoutHover, setLogoutHover] = useState(false);

  const navPanelRef = useRef(null);
  const closeBtnRef = useRef(null);
  const hamburgerBtnRef = useRef(null);

  const isAdmin = user && ADMIN_UIDS.includes(user.uid);
  const location = useLocation();
  const hideFontPanel = location.pathname === '/' && !user;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setGlobalFontSize(getDefaultFontSize());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  useEffect(() => {
    async function saveFcmToken() {
      if (user && userInfo) {
        const token = await requestFcmToken();
        if (token) {
          await setDoc(doc(db, 'users', user.uid), { fcmToken: token }, { merge: true });
        }
      }
    }
    saveFcmToken();
  }, [user, userInfo]);

  useEffect(() => {
    if (isNavOpen) {
      closeBtnRef.current?.focus();
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setIsNavOpen(false);
          hamburgerBtnRef.current?.focus();
        }
        if (e.key === 'Tab' && navPanelRef.current) {
          const focusables = navPanelRef.current.querySelectorAll('a,button');
          if (!focusables.length) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          } else if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isNavOpen]);

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

  useEffect(() => {
    document.body.style.background = '#fafafa';
    document.body.style.color = '#222';
    document.body.style.caretColor = '#222';
    document.documentElement.style.setProperty('color-scheme', 'light');
  }, []);

  if (loading) return <div style={{ fontSize: '2rem', padding: '2rem', textAlign: 'center' }}>로딩 중...</div>;

  return (
    <div className="App" style={{ background: '#fafafa', minHeight: '100vh' }}>
      {!hideFontPanel && (
        <div
          style={{
            position: 'fixed',
            bottom: 18,
            right: 18,
            background: '#fff',
            padding: '10px 16px',
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            fontSize: '1rem',
            maxWidth: '200px',
            zIndex: 1000,
          }}
        >
          <button
            style={{ fontSize: '1rem', width: '100%', padding: '8px', marginBottom: 4 }}
            onClick={() => setIsFontPanelOpen((prev) => !prev)}
            aria-expanded={isFontPanelOpen}
            aria-controls="font-panel"
          >
            {isFontPanelOpen ? '접기 ▲' : '글자크기 설정 ▼'}
          </button>
          {isFontPanelOpen && (
            <div id="font-panel" style={{ marginTop: 8, display: 'flex', gap: 8, flexDirection: 'column' }}>
              <button style={{ fontSize: '1rem' }} onClick={() => setGlobalFontSize(isMobile ? '19px' : '18px')}>
                글자 크게
              </button>
              <button style={{ fontSize: '1rem' }} onClick={() => setGlobalFontSize(isMobile ? '17px' : '16px')}>
                기본 크기
              </button>
            </div>
          )}
        </div>
      )}

      <a href="#main-content" className="skip-link" tabIndex={0}>본문 바로가기</a>

      <header className="app-header" role="banner" style={{ background: '#fff', borderBottom: '2px solid #e3e3e3', position: 'sticky', top: 0, zIndex: 1200 }}>
        <div
          className="header-content"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            minHeight: 60,
            padding: '0 18px',
          }}
        >
          <h1
            style={{ margin: 0, fontSize: '1.5rem', letterSpacing: '0.04em', color: '#1976d2', fontWeight: 800 }}
          >
            <Link to="/" style={{ textDecoration: 'none', color: '#1976d2', fontWeight: 800 }}>
              영중 행복마을
            </Link>
          </h1>
          <nav className="desktop-nav" aria-label="주요 메뉴" style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0 }}>
            {user && (
              <>
                <NavLink to="/notices" style={({ isActive }) => (isActive ? menuItemActiveStyle : menuItemStyle)}>
                  공지
                </NavLink>
                <NavLink to="/meetings" style={({ isActive }) => (isActive ? menuItemActiveStyle : menuItemStyle)}>
                  모임
                </NavLink>
                <NavLink to="/proposals" style={({ isActive }) => (isActive ? menuItemActiveStyle : menuItemStyle)}>
                  주민 제안
                </NavLink>
                <NavLink to="/chat" style={({ isActive }) => (isActive ? menuItemActiveStyle : menuItemStyle)}>
                  채팅
                </NavLink>
                <NavLink to="/mypage" style={({ isActive }) => (isActive ? menuItemActiveStyle : menuItemStyle)}>
                  마이페이지
                </NavLink>
                <NavLink to="/inquiries" style={({ isActive }) => (isActive ? menuItemActiveStyle : menuItemStyle)}>
                  문의사항
                </NavLink>
                <NavLink to="/my-messages" style={({ isActive }) => (isActive ? menuItemActiveStyle : menuItemStyle)}>
                  쪽지함
                </NavLink>
                {isAdmin && (
                  <NavLink to="/admin" style={({ isActive }) => (isActive ? menuItemActiveStyle : menuItemStyle)}>
                    관리자
                  </NavLink>
                )}
                <button
                  onClick={handleLogout}
                  onMouseEnter={() => setLogoutHover(true)}
                  onMouseLeave={() => setLogoutHover(false)}
                  style={logoutHover ? logoutBtnHoverStyle : logoutBtnStyle}
                  tabIndex={0}
                >
                  로그아웃
                </button>
              </>
            )}
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
            {user && (
              <div className="user-info" style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', fontSize: '1rem' }}>
                <span>환영합니다, {userInfo?.nickname || userInfo?.name || user?.email} 님!</span>
              </div>
            )}
            {user && isMobile && (
              <button
                ref={hamburgerBtnRef}
                className="mobile-nav-toggle"
                aria-label="메뉴 열기"
                aria-expanded={isNavOpen}
                aria-controls="mobile-nav"
                onClick={() => setIsNavOpen(true)}
                tabIndex={0}
                style={{
                  marginLeft: 18,
                  width: 44,
                  height: 44,
                  fontSize: '1.6rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#222',
                  zIndex: 1200,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ☰
              </button>
            )}
          </div>
        </div>
      </header>

      {isNavOpen && (
        <nav
          id="mobile-nav"
          ref={navPanelRef}
          className="mobile-nav"
          aria-label="모바일 메뉴"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: '#fff',
            zIndex: 1400,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            fontSize: isMobile ? '1.06rem' : '1rem',
            paddingTop: 0,
            outline: 'none',
          }}
          tabIndex={-1}
        >
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 18px',
              borderBottom: '1px solid #e3e3e3',
              height: 56,
              position: 'relative',
              background: '#fff',
            }}
          >
            <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.04em', color: '#1976d2' }}>메뉴</span>
            <button
              ref={closeBtnRef}
              aria-label="메뉴 닫기"
              onClick={() => {
                setIsNavOpen(false);
                hamburgerBtnRef.current?.focus();
              }}
              tabIndex={0}
              style={{
                width: 44,
                height: 44,
                fontSize: '1.6rem',
                background: '#fff',
                border: '2px solid #1976d2',
                color: '#1976d2',
                borderRadius: 10,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'absolute',
                right: 18,
                top: 6,
                boxShadow: '0 2px 8px rgba(25,118,210,0.08)',
              }}
            >
              ✕
            </button>
          </div>
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              marginTop: 0,
            }}
          >
            {user && (
              <>
                <NavLink to="/notices" onClick={() => setIsNavOpen(false)} style={({ isActive }) => (isActive ? menuItemActiveStyle : menuItemStyle)} tabIndex={0}>
                  공지
                </NavLink>
                <NavLink to="/meetings" onClick={() => setIsNavOpen(false)} style={({ isActive }) => (isActive ? menuItemActiveStyle : menuItemStyle)} tabIndex={0}>
                  모임
                </NavLink>
                <NavLink to="/proposals" onClick={() => setIsNavOpen(false)} style={({ isActive }) => (isActive ? menuItemActiveStyle : menuItemStyle)} tabIndex={0}>
                  주민 제안
                </NavLink>
                <NavLink to="/chat" onClick={() => setIsNavOpen(false)} style={({ isActive }) => (isActive ? menuItemActiveStyle : menuItemStyle)} tabIndex={0}>
                  채팅
                </NavLink>
                <NavLink to="/mypage" onClick={() => setIsNavOpen(false)} style={({ isActive }) => (isActive ? menuItemActiveStyle : menuItemStyle)} tabIndex={0}>
                  마이페이지
                </NavLink>
                <NavLink to="/inquiries" onClick={() => setIsNavOpen(false)} style={({ isActive }) => (isActive ? menuItemActiveStyle : menuItemStyle)} tabIndex={0}>
                  문의사항
                </NavLink>
                <NavLink to="/my-messages" onClick={() => setIsNavOpen(false)} style={({ isActive }) => (isActive ? menuItemActiveStyle : menuItemStyle)} tabIndex={0}>
                  쪽지함
                </NavLink>
                {isAdmin && (
                  <NavLink to="/admin" onClick={() => setIsNavOpen(false)} style={({ isActive }) => (isActive ? menuItemActiveStyle : menuItemStyle)} tabIndex={0}>
                    관리자
                  </NavLink>
                )}
                <button
                  onClick={handleLogout}
                  style={{
                    ...menuItemStyle,
                    marginTop: '24px',
                    background: '#f2f2f2',
                    color: '#b00',
                    fontWeight: 800,
                    fontSize: '1rem',
                    borderRadius: 8,
                  }}
                  tabIndex={0}
                >
                  로그아웃
                </button>
              </>
            )}
          </div>
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
              <Route path="/proposals/:proposalId" element={<ProposalDetail />} />
              <Route path="/chat" element={<ChatListPage userInfo={userInfo} />} />
              <Route path="/chat/:roomId" element={<ChatRoomPage userInfo={userInfo} />} />
              <Route path="/mypage" element={<MyPage userInfo={userInfo} onProfileUpdate={handleProfileUpdate} />} />
              <Route path="/my-messages" element={<MyMessagesPage />} />
              <Route path="/inquiries" element={<InquiriesPage userInfo={userInfo} isAdmin={isAdmin} />} />
              <Route path="/inquiry/:id" element={<InquiryDetail />} /> {/* 추가 */}
              <Route path="/openchat/new" element={<OpenChatRoomForm />} />
              <Route path="/openchat/list" element={<OpenChatRoomList />} />
              <Route path="/openchat/:roomId" element={<OpenChatPage />} />
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

      <footer className="app-footer" style={{ textAlign: 'center', padding: '1.2rem 0', fontSize: '1rem', background: '#f0f0f0' }}>
        <p>
          <Link to="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#222', textDecoration: 'underline' }}>
            이용약관
          </Link>{' '}
          |{' '}
          <Link to="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#222', textDecoration: 'underline' }}>
            개인정보처리방침
          </Link>
        </p>
      </footer>
    </div>
  );
}

export default AppRoutes;