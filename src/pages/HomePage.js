import React, { useState, useEffect } from 'react';
import PostForm from '../components/PostForm';
import PostList from '../components/PostList';
import MeetingCarousel from '../components/MeetingCarousel';
import MessageModal from '../components/MessageModal';
import ChatModal from '../components/ChatModal';
import { Carousel } from 'react-responsive-carousel';
import "react-responsive-carousel/lib/styles/carousel.min.css";
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

const HomePage = ({ userInfo }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [myMeetings, setMyMeetings] = useState([]);
  const [myChats, setMyChats] = useState([]);
  const [activeTab, setActiveTab] = useState('모임');
  const [searchResults, setSearchResults] = useState({
    meetings: [],
    notices: [],
    proposals: [],
    chatRooms: [],
    users: [],
  });
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [targetUser, setTargetUser] = useState(null);

  useEffect(() => {
    if (!userInfo?.uid) return;
    const fetchMeetings = async () => {
      const q = query(collection(db, "meetings"), where("applicants", "array-contains", userInfo.uid));
      const snap = await getDocs(q);
      setMyMeetings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    const fetchChats = async () => {
      const q = query(collection(db, "chatRooms"), where("participants", "array-contains", userInfo.uid));
      const snap = await getDocs(q);
      setMyChats(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchMeetings();
    fetchChats();
  }, [userInfo]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults({ meetings: [], notices: [], proposals: [], chatRooms: [], users: [] });
      return;
    }
    const meetingQ = query(collection(db, "meetings"), orderBy("meetingTime", "desc"));
    const meetingSnap = await getDocs(meetingQ);
    const meetings = meetingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(m => (m.title || '').includes(searchQuery));
    const noticeQ = query(collection(db, "notices"), orderBy("createdAt", "desc"));
    const noticeSnap = await getDocs(noticeQ);
    const notices = noticeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(n => (n.title || '').includes(searchQuery));
    const proposalQ = query(collection(db, "proposals"), orderBy("createdAt", "desc"));
    const proposalSnap = await getDocs(proposalQ);
    const proposals = proposalSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(p => (p.title || '').includes(searchQuery));
    const chatQ = query(collection(db, "chatRooms"));
    const chatSnap = await getDocs(chatQ);
    const chatRooms = chatSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(c => (c.roomName || '').includes(searchQuery));
    const userQ = query(collection(db, "users"));
    const userSnap = await getDocs(userQ);
    const users = userSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(u => (u.nickname || u.name || '').includes(searchQuery));
    setSearchResults({ meetings, notices, proposals, chatRooms, users });
  };

  const handlePostAdded = () => setRefreshKey(prevKey => prevKey + 1);

  const recentMeeting = myMeetings[0];
  const todayMeetings = myMeetings.filter(m => new Date(m.meetingTime).toDateString() === new Date().toDateString());
  const weekMeetings = myMeetings.filter(m => {
    const now = new Date();
    const target = new Date(m.meetingTime);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
    return target >= startOfWeek && target <= endOfWeek;
  });
  const recentChat = myChats[0];
  const unreadCount = myChats.reduce((acc, room) => acc + (room.unreadCount || 0), 0);

  const handleMessageClick = (user) => {
    setTargetUser(user);
    setShowMessageModal(true);
  };
  const handleChatClick = (user) => {
    setTargetUser(user);
    setShowChatModal(true);
  };

  const quickCards = [
    {
      key: "myMeeting",
      ariaLabel: "내 모임 카드",
      title: "내 모임",
      icon: "👥",
      content: (
        <>
          <div style={{fontSize:"14px", color:"#888"}}>{myMeetings.length}개 참여중</div>
          {recentMeeting && <div style={{fontSize:"14px", color:"#222"}}>최근: {recentMeeting.title}</div>}
          <div style={{fontSize:"13px", color:"#888"}}>오늘: {todayMeetings.length}개, 이번주: {weekMeetings.length}개</div>
          {recentMeeting && (
            <button
              style={{marginTop:"8px", fontSize:"14px", background:"#0d6efd", color:"#fff", border:"none", borderRadius:"6px", padding:"4px 10px", cursor:"pointer"}}
              onClick={() => window.location.href = `/meeting/${recentMeeting.id}`}
              aria-label="모임 바로가기"
              title="모임 바로가기"
            >모임 바로가기</button>
          )}
        </>
      )
    },
    {
      key: "myChat",
      ariaLabel: "내 채팅 카드",
      title: "내 채팅",
      icon: "💬",
      content: (
        <>
          <div style={{fontSize:"14px", color:"#888"}}>{myChats.length}개 참여중</div>
          {recentChat && <div style={{fontSize:"14px", color:"#222"}}>최근: {recentChat.roomName}</div>}
          <div style={{fontSize:"13px", color:"#888"}}>안 읽음: {unreadCount}개</div>
          {recentChat && (
            <button
              style={{marginTop:"8px", fontSize:"14px", background:"#0d6efd", color:"#fff", border:"none", borderRadius:"6px", padding:"4px 10px", cursor:"pointer"}}
              onClick={() => window.location.href = `/chat/${recentChat.id}`}
              aria-label="채팅방 바로가기"
              title="채팅방 바로가기"
            >채팅방 바로가기</button>
          )}
        </>
      )
    },
    {
      key: "todayMeeting",
      ariaLabel: "오늘 모임 일정 카드",
      title: "오늘 모임",
      icon: "📅",
      content: (
        <>
          <div style={{fontSize:"14px", color:"#888"}}>{todayMeetings.length}개</div>
          {todayMeetings.map(m => (
            <div key={m.id} style={{fontSize:"13px", margin:"2px 0"}}>
              <span title={m.title}>{m.title}</span>
              <span style={{marginLeft:"4px", color:"#666"}}>{new Date(m.meetingTime).toLocaleTimeString('ko-KR', {hour:'2-digit', minute:'2-digit'})}</span>
            </div>
          ))}
        </>
      )
    },
    {
      key: "weekMeeting",
      ariaLabel: "이번주 모임 일정 카드",
      title: "이번주 모임",
      icon: "🗓️",
      content: (
        <>
          <div style={{fontSize:"14px", color:"#888"}}>{weekMeetings.length}개</div>
          {weekMeetings.map(m => (
            <div key={m.id} style={{fontSize:"13px", margin:"2px 0"}}>
              <span title={m.title}>{m.title}</span>
              <span style={{marginLeft:"4px", color:"#666"}}>
                {new Date(m.meetingTime).toLocaleDateString('ko-KR', {month:'2-digit', day:'2-digit'})} {new Date(m.meetingTime).toLocaleTimeString('ko-KR', {hour:'2-digit', minute:'2-digit'})}
              </span>
            </div>
          ))}
        </>
      )
    }
  ];

  const tabList = [
    { label: '모임', key: 'meetings' },
    { label: '공지', key: 'notices' },
    { label: '제안', key: 'proposals' },
    { label: '채팅방', key: 'chatRooms' },
    { label: '회원', key: 'users' }
  ];

  return (
    <div className="homepage" style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px" }}>
      <div className="site-title-area" style={{marginBottom: "18px", textAlign: "center"}}>
        <h1 style={{fontWeight: 700, fontSize: "2rem", margin: 0, color: "#0d6efd"}} aria-label="영중 행복마을" title="영중 행복마을">영중 행복마을</h1>
        <div className="site-desc" style={{fontSize: "16px", color: "#666", marginTop: "6px"}} aria-label="우리 동네 소통·정보·모임 플랫폼" title="우리 동네 소통·정보·모임 플랫폼">
          우리 동네 소통·정보·모임 플랫폼
        </div>
      </div>

      <a href="#main-content" className="skip-link" tabIndex={0}>본문 바로가기</a>

      <input
        className="main-search"
        type="text"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
        placeholder="모임, 제안, 공지, 채팅방, 회원 검색"
        aria-label="모임, 제안, 공지, 채팅방, 회원 통합 검색"
        title="모임, 제안, 공지, 채팅방, 회원 통합 검색"
        style={{
          width: "100%",
          maxWidth: "400px",
          margin: "12px auto 24px auto",
          display: "block",
          padding: "12px 16px",
          borderRadius: "8px",
          border: "1px solid #ddd",
          fontSize: "16px"
        }}
      />

      <div style={{marginBottom:"28px"}}>
        <Carousel
          showThumbs={false}
          showStatus={false}
          showIndicators={true}
          infiniteLoop
          emulateTouch
          swipeable
          centerMode={false}
          autoPlay={false}
          interval={5000}
          ariaLabel="내 정보 카드 캐러셀"
          renderArrowPrev={(onClickHandler, hasPrev, label) =>
            hasPrev && (
              <button type="button" onClick={onClickHandler} title="이전 카드" aria-label="이전 카드" style={{position:'absolute', left:0, top:'40%', zIndex:2, background:'rgba(0,0,0,0.1)', border:'none', borderRadius:'50%', width:'32px', height:'32px', fontSize:'20px', color:'#0d6efd', cursor:'pointer'}}>‹</button>
            )
          }
          renderArrowNext={(onClickHandler, hasNext, label) =>
            hasNext && (
              <button type="button" onClick={onClickHandler} title="다음 카드" aria-label="다음 카드" style={{position:'absolute', right:0, top:'40%', zIndex:2, background:'rgba(0,0,0,0.1)', border:'none', borderRadius:'50%', width:'32px', height:'32px', fontSize:'20px', color:'#0d6efd', cursor:'pointer'}}>›</button>
            )
          }
        >
          {quickCards.map(card => (
            <div key={card.key} aria-label={card.ariaLabel} title={card.title} style={{padding:"8px"}}>
              <div style={{
                background:"#fff", borderRadius:"12px", boxShadow:"0 2px 8px #eee", padding:"18px 22px", minWidth:"140px", textAlign:"center", maxWidth:"260px", margin:"0 auto"
              }}>
                <div style={{fontSize:"28px", marginBottom:"6px"}}>{card.icon}</div>
                <div style={{fontWeight:600, fontSize:"17px", marginBottom:"6px"}}>{card.title}</div>
                {card.content}
              </div>
            </div>
          ))}
        </Carousel>
      </div>

      {searchQuery.trim() && (
        <>
          <div className="search-tabs" style={{display:"flex", gap:"8px", marginBottom:"10px", justifyContent:"center"}}>
            {tabList.map(tab => {
              const hasResult = searchResults[tab.key] && searchResults[tab.key].length > 0;
              return (
                <button
                  key={tab.label}
                  className={activeTab === tab.label ? 'active' : ''}
                  style={{
                    background: activeTab === tab.label
                      ? '#0d6efd'
                      : hasResult
                        ? '#e3f0ff'
                        : '#f8f9fa',
                    color: activeTab === tab.label
                      ? '#fff'
                      : hasResult
                        ? '#0d6efd'
                        : '#888',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    padding: '6px 16px',
                    fontWeight: activeTab === tab.label ? 700 : 400,
                    cursor: 'pointer',
                    position: 'relative',
                    outline: activeTab === tab.label ? '2px solid #0d6efd' : 'none',
                    boxShadow: activeTab === tab.label ? '0 2px 8px #b3d4fc' : 'none'
                  }}
                  onClick={() => setActiveTab(tab.label)}
                  aria-label={`${tab.label} 검색 결과 보기`}
                  title={`${tab.label} 검색 결과 보기`}
                >
                  {tab.label}
                  <span style={{
                    display: 'inline-block',
                    minWidth: '18px',
                    marginLeft: '6px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    background: hasResult
                      ? (activeTab === tab.label ? '#fff' : '#0d6efd')
                      : '#eee',
                    color: hasResult
                      ? (activeTab === tab.label ? '#0d6efd' : '#fff')
                      : '#bbb',
                    fontWeight: 700
                  }}>
                    {searchResults[tab.key]?.length || 0}
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{textAlign:'center', marginBottom:'12px', color:'#0d6efd', fontWeight:600, fontSize:'16px'}}>
            "{searchQuery}" 검색 결과 - <span style={{color:'#222'}}>{activeTab}</span>
          </div>
          <div className="search-results-list" style={{marginBottom:"20px"}}>
            {activeTab === '모임' && (
              <div>
                {searchResults.meetings.length === 0 ? <p>검색된 모임이 없습니다.</p> :
                  searchResults.meetings.map(m => (
                    <div key={m.id} style={{border:"1px solid #eee", borderRadius:"8px", padding:"12px", marginBottom:"8px"}}>
                      <div style={{fontWeight:600}}>{m.title}</div>
                      <div style={{fontSize:"14px", color:"#888"}}>{new Date(m.meetingTime).toLocaleString('ko-KR')}</div>
                      <div style={{fontSize:"14px"}}>{m.location}</div>
                      <button
                        style={{marginTop:"6px", fontSize:"13px", background:"#0d6efd", color:"#fff", border:"none", borderRadius:"6px", padding:"2px 10px", cursor:"pointer"}}
                        onClick={() => window.location.href = `/meeting/${m.id}`}
                        aria-label="모임 바로가기"
                        title="모임 바로가기"
                      >모임 바로가기</button>
                    </div>
                  ))
                }
              </div>
            )}
            {activeTab === '공지' && (
              <div>
                {searchResults.notices.length === 0 ? <p>검색된 공지가 없습니다.</p> :
                  searchResults.notices.map(n => (
                    <div key={n.id} style={{border:"1px solid #eee", borderRadius:"8px", padding:"12px", marginBottom:"8px"}}>
                      <div style={{fontWeight:600}}>{n.title}</div>
                      <div style={{fontSize:"14px", color:"#888"}}>{n.content?.slice(0, 40)}</div>
                    </div>
                  ))
                }
              </div>
            )}
            {activeTab === '제안' && (
              <div>
                {searchResults.proposals.length === 0 ? <p>검색된 제안이 없습니다.</p> :
                  searchResults.proposals.map(p => (
                    <div key={p.id} style={{border:"1px solid #eee", borderRadius:"8px", padding:"12px", marginBottom:"8px"}}>
                      <div style={{fontWeight:600}}>{p.title}</div>
                      <div style={{fontSize:"14px", color:"#888"}}>{p.content?.slice(0, 40)}</div>
                    </div>
                  ))
                }
              </div>
            )}
            {activeTab === '채팅방' && (
              <div>
                {searchResults.chatRooms.length === 0 ? <p>검색된 채팅방이 없습니다.</p> :
                  searchResults.chatRooms.map(c => (
                    <div key={c.id} style={{border:"1px solid #eee", borderRadius:"8px", padding:"12px", marginBottom:"8px"}}>
                      <div style={{fontWeight:600}}>{c.roomName}</div>
                      <button
                        style={{marginTop:"6px", fontSize:"13px", background:"#0d6efd", color:"#fff", border:"none", borderRadius:"6px", padding:"2px 10px", cursor:"pointer"}}
                        onClick={() => window.location.href = `/chat/${c.id}`}
                        aria-label="채팅방 바로가기"
                        title="채팅방 바로가기"
                      >채팅방 바로가기</button>
                    </div>
                  ))
                }
              </div>
            )}
            {activeTab === '회원' && (
              <div>
                {searchResults.users.length === 0 ? <p>검색된 회원이 없습니다.</p> :
                  searchResults.users.map(u => (
                    <div
                      key={u.uid}
                      style={{border:"1px solid #eee", borderRadius:"8px", padding:"12px", marginBottom:"8px", display:"flex", alignItems:"center", justifyContent:"space-between"}}
                      aria-label={`회원: ${u.nickname}${u.name ? ` (${u.name})` : ''}`}
                      title={`회원: ${u.nickname}${u.name ? ` (${u.name})` : ''}`}
                    >
                      <span style={{fontWeight:600, cursor:"pointer"}}
                        tabIndex={0}
                        aria-label={`프로필 보기: ${u.nickname}${u.name ? ` (${u.name})` : ''}`}
                        title="프로필 보기"
                        onClick={() => window.location.href = `/profile/${u.uid}`}
                        onKeyDown={e => { if (e.key === 'Enter') window.location.href = `/profile/${u.uid}`; }}
                      >
                        {u.nickname}{u.name && ` (${u.name})`}
                      </span>
                      <span style={{display:"flex", gap:"8px"}}>
                        <button
                          aria-label="쪽지 보내기"
                          title="쪽지 보내기"
                          onClick={() => handleMessageClick(u)}
                          style={{
                            background:"#0d6efd",
                            color:"#fff",
                            border:"none",
                            borderRadius:"6px",
                            padding:"6px 14px",
                            cursor:"pointer",
                            fontWeight:600,
                            marginRight:"4px"
                          }}
                          onMouseOver={e => e.currentTarget.style.background = "#0956b3"}
                          onMouseOut={e => e.currentTarget.style.background = "#0d6efd"}
                        >✉️ 쪽지</button>
                        <button
                          aria-label="채팅 시작"
                          title="채팅 시작"
                          onClick={() => handleChatClick(u)}
                          style={{
                            background:"#20c997",
                            color:"#fff",
                            border:"none",
                            borderRadius:"6px",
                            padding:"6px 14px",
                            cursor:"pointer",
                            fontWeight:600
                          }}
                          onMouseOver={e => e.currentTarget.style.background = "#148f6d"}
                          onMouseOut={e => e.currentTarget.style.background = "#20c997"}
                        >💬 채팅</button>
                      </span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        </>
      )}

      <div className="card-section" style={{marginBottom:"36px"}}>
        <div className="card-section-title" style={{fontSize:"20px", fontWeight:700, marginBottom:"12px", color:"#222"}} aria-label="모집 중인 모임" title="모집 중인 모임">모집 중인 모임</div>
        <div className="card-section-desc" style={{fontSize:"15px", color:"#666", marginBottom:"18px"}} aria-label="지금 참여할 수 있는 모임을 확인하세요." title="지금 참여할 수 있는 모임을 확인하세요.">
          지금 참여할 수 있는 모임을 확인하세요.
        </div>
        <MeetingCarousel
          onMeetingClick={(meetingId) => {
            window.location.href = `/meeting/${meetingId}`;
          }}
          showDescription={true}
        />
      </div>

      <div className="card-section" style={{marginBottom:"36px"}}>
        <div className="card-section-title" style={{fontSize:"20px", fontWeight:700, marginBottom:"12px", color:"#222"}} aria-label="자유 게시판" title="자유 게시판">자유 게시판</div>
        <div className="card-section-desc" style={{fontSize:"15px", color:"#666", marginBottom:"18px"}} aria-label="다양한 이야기를 자유롭게 나눠보세요." title="다양한 이야기를 자유롭게 나눠보세요.">
          다양한 이야기를 자유롭게 나눠보세요.
        </div>
        <div className="form-section">
          <PostForm userInfo={userInfo} onPostAdded={handlePostAdded} />
        </div>
        <div className="list-section">
          <h3 style={{fontSize:"17px", fontWeight:600, marginBottom:"10px"}} aria-label="전체 글 목록" title="전체 글 목록">전체 글 목록</h3>
          <PostList key={refreshKey} userInfo={userInfo} />
        </div>
      </div>

      {showMessageModal && targetUser && (
        <MessageModal
          open={showMessageModal}
          onClose={() => setShowMessageModal(false)}
          fromUser={userInfo}
          toUser={targetUser}
        />
      )}
      {showChatModal && targetUser && (
        <ChatModal
          open={showChatModal}
          onClose={() => setShowChatModal(false)}
          fromUser={userInfo}
          toUser={targetUser}
        />
      )}
    </div>
  );
};

export default HomePage;