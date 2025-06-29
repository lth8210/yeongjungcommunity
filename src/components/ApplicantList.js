import React, { useState } from 'react';

const ApplicantList = ({ applicants = [], pendingApplicants = [], currentUser, onMessage, onChat, onCancelApply, onApprove, isGroupChat = false, id, meetingId }) => {
  const [openUid, setOpenUid] = useState(null);

  const VISIBLE_COUNT = 5;
  const visibleApplicants = applicants.slice(0, VISIBLE_COUNT);
  const hiddenApplicants = applicants.slice(VISIBLE_COUNT);

  const getAvatar = (nickname) => (
    <span
      style={{
        display: 'inline-block',
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: '#e7f5ff',
        color: '#1971c2',
        textAlign: 'center',
        lineHeight: '24px',
        marginRight: 4,
        fontWeight: 600,
      }}
    >
      {nickname?.charAt(0) || '유'}
    </span>
  );

  const Overlay = ({ onClose }) => (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.01)',
        zIndex: 999,
      }}
      onClick={onClose}
      aria-label="팝업 닫기 오버레이"
      tabIndex={-1}
    />
  );

  const renderApplicantPopup = (applicant) => (
    <>
      <Overlay onClose={() => setOpenUid(null)} />
      <div
        style={{
          position: 'absolute',
          top: '110%',
          left: 0,
          background: '#fff',
          border: '1px solid #ccc',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          padding: 8,
          zIndex: 1000,
          minWidth: 110,
        }}
        tabIndex={0}
        role="dialog"
        aria-modal="true"
        aria-label={`${applicant.nickname} 프로필 팝업`}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpenUid(null);
        }}
      >
        <button
          style={{
            position: 'absolute',
            top: 4,
            right: 6,
            background: 'none',
            border: 'none',
            fontSize: 18,
            color: '#999',
            cursor: 'pointer',
          }}
          aria-label="닫기"
          onClick={(e) => {
            e.stopPropagation();
            setOpenUid(null);
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            setOpenUid(null);
          }}
        >
          ×
        </button>
        {applicant.uid !== currentUser?.uid && (
          <>
            {typeof onMessage === 'function' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMessage(applicant);
                  setOpenUid(null);
                }}
                aria-label="쪽지 보내기"
                style={{ marginRight: 8 }}
              >
                쪽지
              </button>
            )}
            {typeof onChat === 'function' && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onChat({
        ...applicant,
        type: isGroupChat ? 'group' : 'oneToOne',
        groupId: isGroupChat ? id : undefined,
        meetingId: meetingId,
      });
      setOpenUid(null);
    }}
    aria-label="채팅 시작"
  >
    채팅
  </button>
)}
          </>
        )}
        {applicant.uid === currentUser?.uid && typeof onCancelApply === 'function' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancelApply();
              setOpenUid(null);
            }}
            aria-label="참여 취소"
          >
            참여 취소
          </button>
        )}
        {pendingApplicants.some((p) => p.uid === applicant.uid) && typeof onApprove === 'function' && currentUser?.uid === applicants[0]?.uid && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApprove(applicant.uid);
              setOpenUid(null);
            }}
            aria-label="승인"
            style={{ marginLeft: 8 }}
          >
            승인
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="applicant-list" style={{ marginBottom: 8 }}>
      <strong>참여자:</strong>
      <ul style={{ display: 'inline', marginLeft: 8, padding: 0 }}>
        {visibleApplicants.map((applicant, idx) => (
          <li key={`visible-${applicant.uid}-${idx}`} style={{ display: 'inline', marginRight: 8, position: 'relative' }}>
            <span
              style={{ cursor: applicant.uid === currentUser?.uid ? 'default' : 'pointer', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center' }}
              tabIndex={0}
              aria-label={`${applicant.nickname} 프로필 열기`}
              onClick={(e) => {
                e.stopPropagation();
                if (applicant.uid === currentUser?.uid) return; // 내 닉네임 클릭 시 팝업 X
                setOpenUid(openUid === applicant.uid ? null : applicant.uid);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation();
                  if (applicant.uid === currentUser?.uid) return;
                  setOpenUid(openUid === applicant.uid ? null : applicant.uid);
                }
              }}
            >
              {getAvatar(applicant.nickname)}
              {applicant.nickname}
              {applicant.isAdmin && <span style={{ marginLeft: 2, color: '#fa5252', fontWeight: 700, fontSize: 12 }}>관리자</span>}
            </span>
            {openUid === applicant.uid && renderApplicantPopup(applicant)}
          </li>
        ))}
        {hiddenApplicants.length > 0 && (
          <li key="more" style={{ display: 'inline', marginRight: 8, position: 'relative' }}>
            <span
              style={{ cursor: 'pointer', color: '#1976d2', fontWeight: 600 }}
              tabIndex={0}
              aria-label={`+${hiddenApplicants.length}명 더보기`}
              onClick={(e) => {
                e.stopPropagation();
                setOpenUid('more');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation();
                  setOpenUid('more');
                }
              }}
            >
              +{hiddenApplicants.length}명 더보기
            </span>
            {openUid === 'more' && (
              <>
                <Overlay onClose={() => setOpenUid(null)} />
                <div
                  style={{
                    position: 'absolute',
                    top: '110%',
                    left: 0,
                    background: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    padding: 8,
                    zIndex: 1000,
                    minWidth: 120,
                  }}
                  tabIndex={0}
                  role="dialog"
                  aria-modal="true"
                  aria-label="참여자 더보기 팝업"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setOpenUid(null);
                  }}
                >
                  <button
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 6,
                      background: 'none',
                      border: 'none',
                      fontSize: 18,
                      color: '#999',
                      cursor: 'pointer',
                    }}
                    aria-label="닫기"
                    onClick={() => setOpenUid(null)}
                  >
                    ×
                  </button>
                  {hiddenApplicants.map((applicant, idx) => (
                    <div key={`hidden-${applicant.uid}-${idx}`} style={{ marginBottom: 6 }}>
                      <span
                        style={{ cursor: applicant.uid === currentUser?.uid ? 'default' : 'pointer', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center' }}
                        tabIndex={0}
                        aria-label={`${applicant.nickname} 프로필 열기`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (applicant.uid === currentUser?.uid) return;
                          setOpenUid(applicant.uid);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.stopPropagation();
                            if (applicant.uid === currentUser?.uid) return;
                            setOpenUid(applicant.uid);
                          }
                        }}
                      >
                        {getAvatar(applicant.nickname)}
                        {applicant.nickname}
                        {applicant.isAdmin && <span style={{ marginLeft: 2, color: '#fa5252', fontWeight: 700, fontSize: 12 }}>관리자</span>}
                      </span>
                      {openUid === applicant.uid && renderApplicantPopup(applicant)}
                    </div>
                  ))}
                </div>
              </>
            )}
          </li>
        )}
      </ul>
      {pendingApplicants.length > 0 && currentUser?.uid === applicants[0]?.uid && (
        <div style={{ marginTop: 8 }}>
          <strong>승인 대기:</strong>
          <ul style={{ display: 'inline', marginLeft: 8, padding: 0 }}>
            {pendingApplicants.map((applicant, idx) => (
              <li key={`pending-${applicant.uid}-${idx}`} style={{ display: 'inline', marginRight: 8 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  {getAvatar(applicant.nickname)}
                  {applicant.nickname}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onApprove(applicant.uid);
                    }}
                    aria-label={`${applicant.nickname} 승인`}
                    style={{ marginLeft: 8, padding: '2px 8px', background: '#e9ecef', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                  >
                    승인
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ApplicantList;