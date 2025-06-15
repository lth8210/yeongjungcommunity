import './App.css';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
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
      alert("로그아웃 중 오류가 발생했습니다.");
      console.error("로그아웃 오류:", error);
    }
  };

  const handleProfileUpdate = (updatedInfo) => {
    setUserInfo(prev => ({ ...prev, ...updatedInfo }));
  };

  if (loading) {
    return (
      <div className="loading-screen" role="status" aria-live="polite">
        로딩 중...
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        {/* 본문 바로가기(스킵네비게이션) */}
        <a href="#main-content" className="skip-link" tabIndex={0}>본문 바로가기</a>
        <header className="app-header" role="banner">
          <div className="header-content">
            <h1>
              <Link to="/" aria-label="홈으로 이동" title="홈으로 이동" tabIndex={0}>
                영중 행복마을
              </Link>
            </h1>
            <nav className="desktop-nav" aria-label="주요 메뉴">
              {user && (
                <>
                  <Link to="/notices" tabIndex={0} aria-label="공지" title="공지">공지</Link>
                  <Link to="/meetings" tabIndex={0} aria-label="모임" title="모임">모임</Link>
                  <Link to="/proposals" tabIndex={0} aria-label="주민 제안" title="주민 제안">주민 제안</Link>
                  <Link to="/chat" tabIndex={0} aria-label="채팅" title="채팅">채팅</Link>
                  <Link to="/mypage" tabIndex={0} aria-label="마이페이지" title="마이페이지">마이페이지</Link>
                  <Link to="/inquiries" tabIndex={0} aria-label="문의사항" title="문의사항">문의사항</Link>
                  {isAdmin && (
                    <Link to="/admin" className="admin-link" tabIndex={0} aria-label="관리자" title="관리자">관리자</Link>
                  )}
                </>
              )}
            </nav>
            {user && (
              <div className="user-info" aria-label="로그인 정보">
                <span>
                  환영합니다, {userInfo?.nickname || userInfo?.name || user?.email} 님!
                </span>
                <button
                  onClick={handleLogout}
                  className="logout-button"
                  aria-label="로그아웃"
                  title="로그아웃"
                  tabIndex={0}
                >
                  로그아웃
                </button>
              </div>
            )}
            {user && (
              <button
                className="mobile-nav-toggle"
                aria-label={isNavOpen ? "모바일 메뉴 닫기" : "모바일 메뉴 열기"}
                title={isNavOpen ? "모바일 메뉴 닫기" : "모바일 메뉴 열기"}
                onClick={() => setIsNavOpen(!isNavOpen)}
                tabIndex={0}
              >
                {isNavOpen ? '✕' : '☰'}
              </button>
            )}
          </div>
        </header>

        {isNavOpen && (
          <nav className="mobile-nav" aria-label="모바일 메뉴">
            {user && (
              <>
                <Link to="/notices" onClick={() => setIsNavOpen(false)} tabIndex={0} aria-label="공지" title="공지">공지</Link>
                <Link to="/meetings" onClick={() => setIsNavOpen(false)} tabIndex={0} aria-label="모임" title="모임">모임</Link>
                <Link to="/proposals" onClick={() => setIsNavOpen(false)} tabIndex={0} aria-label="주민 제안" title="주민 제안">주민 제안</Link>
                <Link to="/chat" onClick={() => setIsNavOpen(false)} tabIndex={0} aria-label="채팅" title="채팅">채팅</Link>
                <Link to="/mypage" onClick={() => setIsNavOpen(false)} tabIndex={0} aria-label="마이페이지" title="마이페이지">마이페이지</Link>
                <Link to="/inquiries" onClick={() => setIsNavOpen(false)} tabIndex={0} aria-label="문의사항" title="문의사항">문의사항</Link>
                {isAdmin && (
                  <Link to="/admin" className="admin-link" onClick={() => setIsNavOpen(false)} tabIndex={0} aria-label="관리자" title="관리자">관리자</Link>
                )}
                <button
                  onClick={handleLogout}
                  className="logout-button mobile-logout"
                  aria-label="로그아웃"
                  title="로그아웃"
                  tabIndex={0}
                >
                  로그아웃
                </button>
              </>
            )}
          </nav>
        )}

        {/* 본문 시작: id와 tabIndex 추가 */}
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
                <Route path="/inquiries" element={<InquiriesPage userInfo={userInfo} isAdmin={isAdmin} />} />
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