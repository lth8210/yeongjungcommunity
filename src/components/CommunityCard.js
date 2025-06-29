import React from 'react';
import StatusBadge from './StatusBadge';
import Button from './Button';
import ApplicantList from './ApplicantList';

const CommunityCard = ({
  id,
  meetingId,
  title,
  content,
  category,
  status,
  applicants,
  pendingApplicants,
  authorName,
  currentUser,
  onApply,
  onCancelApply,
  onApprove,
  onComplete,
  onEdit,
  onDelete,
  onMessage,
  onChat,
  extraFields,
  isProposal = false,
  isInquiry = false,
  isApplicant,
  isAuthor,
  isAdmin,
  children,
  location,
  onUpdate,
  thumbnail,
  authorId,
  usersMap = {},
  isGroupChat = false,
  isChatRoom = false,
  onEnterRoom,
  loading,
  onClick,
}) => {
  const handleDeleteConfirm = () => {
    if (window.confirm('정말로 삭제하시겠습니까?')) {
      onDelete?.();
    }
  };

  // 카드 전체 클릭: 채팅방 카드면 이동 금지, 그 외엔 상세 이동(기존 기능 100% 유지)
  const handleCardClick = (e) => {
    if (
      isChatRoom || // 채팅방 카드면 카드 전체 클릭 이동 금지
      e.target.tagName === 'BUTTON' ||
      e.target.tagName === 'A' ||
      e.target.tagName === 'TEXTAREA' ||
      e.target.tagName === 'INPUT'
    ) {
      return;
    }
    if (onClick) {
      onClick(id);
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // 상세 페이지 이동(모임/제안/문의 등 기존 기능 100% 유지)
    const baseUrl = category === '문의'
      ? `/inquiry/${id}`
      : isProposal
        ? `/proposals/${id}`
        : `/meeting/${meetingId || id}`;
    window.location.href = baseUrl;
  };

  return (
    <div
      className="community-card"
      tabIndex={0}
      aria-label={`${category} 카드 - ${typeof title === 'string' ? title : ''}`}
      onClick={handleCardClick}
      style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 16 }}
    >
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        {thumbnail && (
          <div className="card-thumbnail" style={{ marginRight: 8 }}>
            <img
              src={thumbnail}
              alt={`${typeof title === 'string' ? title : '대표 이미지'}`}
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/80';
                e.target.onerror = null;
              }}
              style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6 }}
            />
          </div>
        )}
        {!thumbnail && (
          <div className="card-thumbnail" style={{ marginRight: 8, width: 80, height: 80, background: '#f0f0f0', borderRadius: 6 }} />
        )}
        <span
          className="category"
          style={{ fontWeight: 700, color: '#0d6efd', background: '#e7f1ff', borderRadius: 12, padding: '4px 12px', fontSize: 14 }}
        >
          {category}
        </span>
        <StatusBadge status={status} isApplicant={isApplicant} />
        <span className="author" style={{ color: '#888', marginLeft: 'auto', fontSize: 14 }}>
          {usersMap && authorId && usersMap[authorId]
            ? `${usersMap[authorId].nickname}${usersMap[authorId].name ? `(${usersMap[authorId].name})` : ''}`
            : authorName || '익명'}
        </span>
      </div>
      <h3 style={{ margin: '8px 0', fontSize: 18 }}>
        {isProposal ? (
          <a
            href={`/proposals/${id}`}
            style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer' }}
            aria-label={`${typeof title === 'string' ? title : ''} 상세 페이지로 이동`}
            onClick={e => e.stopPropagation()}
          >
            {title}
          </a>
        ) : isChatRoom ? (
          <span style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'default' }}>{title}</span>
        ) : (
          <span style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer' }}>
            {title}
          </span>
        )}
      </h3>
      <div style={{ color: '#555', marginBottom: 8 }}>{content}</div>
      {extraFields}
      {!isInquiry && category !== '문의' && location && (
        <div style={{ color: '#666', fontSize: 14, marginBottom: 8 }}>
          <span>
            <b>장소:</b> {location}
          </span>
        </div>
      )}
      {/* 참여자 목록: 항상 렌더링, 닉네임 클릭 시 팝업(쪽지/채팅/닫힘) */}
      {!isInquiry && applicants && applicants.length > 0 && (
        <ApplicantList
          applicants={applicants}
          pendingApplicants={pendingApplicants}
          currentUser={currentUser}
          onMessage={onMessage}
          onChat={onChat}
          onCancelApply={onCancelApply}
          onApprove={onApprove}
          isGroupChat={isGroupChat} // ◀◀◀ 이 줄 추가
          id={id}
          meetingId={meetingId}
        />
      )}
      <div className="card-actions" style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
  {/* 1. 채팅방 목록 페이지에서 보여지는 카드일 경우 */}
  {isChatRoom && (
    <Button variant="primary" onClick={(e) => { e.stopPropagation(); onEnterRoom?.(); }}>
      참여하기
    </Button>
  )}

        {/* 문의일 때 관리자/작성자만 삭제 버튼 */}
        {isInquiry && (isAdmin || isAuthor) && (
          <Button onClick={handleDeleteConfirm} variant="danger" aria-label="삭제">
            삭제
          </Button>
        )}
        {/* 모임/제안 등 기존 버튼 분기 */}
        {!isChatRoom && !isInquiry && (
          <>
            {!isAuthor && !isApplicant && status !== 'done' && (
              <Button variant="primary" onClick={onApply} disabled={status === 'pending'} aria-label="참여하기">
                + 참여하기
              </Button>
            )}
            {isApplicant && status !== 'done' && (
              <Button variant="danger" onClick={onCancelApply} disabled={status === 'pending'} aria-label="참여 취소">
                참여 취소
              </Button>
            )}
            {isAuthor && status !== 'done' && (
              <Button variant="secondary" onClick={onComplete} disabled={status === 'pending'} aria-label="완료">
                ✔ 완료
              </Button>
            )}
            {(isAuthor || isAdmin) && status !== 'done' && (
              <>
                <Button variant="edit" onClick={onEdit} aria-label="수정">
                  수정
                </Button>
                <Button variant="danger" onClick={handleDeleteConfirm} aria-label="삭제">
                  삭제
                </Button>
              </>
            )}
          </>
        )}
        {/* 3. 문의 카드일 경우 */}
        {isInquiry && (isAdmin || isAuthor) && (
          <Button onClick={handleDeleteConfirm} variant="danger">
            삭제
          </Button>
        )}
        
        {children}
      </div>
    </div>
  );
};

export default CommunityCard;