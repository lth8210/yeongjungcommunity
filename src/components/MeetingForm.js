import { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';

const CATEGORYLABELS = {
  hobby: '취미',
  study: '학습',
  volunteer: '봉사',
  etc: '기타',
};
const CATEGORYDESCS = {
  hobby: '취미 모임 (예: 독서, 음악, 운동 등)',
  study: '학습 모임 (예: 스터디, 언어, 자격증 등)',
  volunteer: '봉사 모임 (예: 지역사회, 나눔, 환경 등)',
  etc: '기타 (위에 해당하지 않는 모임)',
};

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const MeetingForm = ({ onMeetingAdded, userInfo }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [category, setCategory] = useState('etc');

  // 드래그 앤 드롭
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files.length > 0) handleFileChange({ target: { files: e.dataTransfer.files } });
  };

  // 파일 업로드 및 제한
  const handleFileChange = async (e) => {
    const filesArray = Array.from(e.target.files);

    if (files.length + filesArray.length > MAX_FILES) {
      setUploadError(`최대 ${MAX_FILES}개까지 첨부할 수 있습니다.`);
      return;
    }
    for (const file of filesArray) {
      if (
        !(
          file.type.startsWith('image/') ||
          file.type === 'application/pdf'
        )
      ) {
        setUploadError('이미지(jpg, png, gif) 또는 PDF만 첨부할 수 있습니다.');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setUploadError('각 파일은 10MB 이하만 첨부할 수 있습니다.');
        return;
      }
    }

    setUploading(true);
    setUploadError('');
    const uploadedFiles = [];
    try {
      for (const file of filesArray) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'yeongjung_preset');
        const res = await fetch('https://api.cloudinary.com/v1_1/dqrcyclit/auto/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.secure_url) {
          uploadedFiles.push({
            url: data.secure_url,
            originalName: file.name,
            type: file.type,
            size: file.size,
          });
        } else {
          throw new Error(data.error?.message || 'Cloudinary 업로드 실패');
        }
      }
      setFiles((prev) => [...prev, ...uploadedFiles]);
    } catch (err) {
      setUploadError(`파일 업로드 중 오류: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = (idx) => {
    setFiles((files) => files.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    const user = auth.currentUser;
    if (!user || !userInfo) {
      alert('모임을 만들려면 로그인이 필요합니다.');
      setIsLoading(false);
      return;
    }
    if (!title || !description || !location || !meetingTime) {
      alert('제목, 설명, 장소, 날짜는 필수입니다.');
      setIsLoading(false);
      return;
    }

    try {
      const hostName = userInfo.name || userInfo.nickname || userInfo.email;

      const newMeetingRef = await addDoc(collection(db, 'meetings'), {
        title,
        description,
        location,
        meetingTime,
        hostId: user.uid,
        hostName,
        createdAt: serverTimestamp(),
        applicants: [user.uid],
        pendingApplicants: [],
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
        files,
        status: 'pending',
        category: category || 'etc',
      });

      await setDoc(doc(db, 'chatRooms', newMeetingRef.id), {
        roomName: title,
        participants: [user.uid],
        participantNames: [hostName],
        lastMessage: '채팅방이 개설되었습니다.',
        updatedAt: serverTimestamp(),
        isGroupChat: true,
        meetingId: newMeetingRef.id,
      });

      alert('새로운 모임과 채팅방이 만들어졌습니다!');
      setTitle('');
      setDescription('');
      setLocation('');
      setMeetingTime('');
      setFiles([]);
      setMaxParticipants('');
      setCategory('etc');
      if (onMeetingAdded) onMeetingAdded();
    } catch (error) {
      console.error('모임/채팅방 생성 중 오류 발생: ', error);
      alert('모임 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="meeting-form-container"
      style={{
        border: '1px solid #ddd',
        borderRadius: 10,
        padding: 16,
        maxWidth: 700,
        minWidth: 320,
        margin: '0 auto',
        background: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
      aria-label="새 모임 만들기"
    >
      <h3 style={{ fontSize: 28, marginBottom: 16, textAlign: 'center' }}>새 모임 만들기</h3>
      <form
        onSubmit={handleSubmit}
        onDragOver={handleDrop}
        onDrop={handleDrop}
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <input
          type="text"
          placeholder="모임 제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ padding: 16, borderRadius: 4, border: '1px solid #ccc', fontSize: 20 }}
          required
          aria-label="모임 제목"
        />
        <textarea
          placeholder="모임 상세 설명"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ padding: 16, borderRadius: 4, border: '1px solid #ccc', minHeight: 80, fontSize: 20 }}
          required
          aria-label="모임 상세 설명"
        />
        <input
          type="text"
          placeholder="모임 장소"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          style={{ padding: 16, borderRadius: 4, border: '1px solid #ccc', fontSize: 20 }}
          required
          aria-label="모임 장소"
        />
        <input
          type="datetime-local"
          value={meetingTime}
          onChange={(e) => setMeetingTime(e.target.value)}
          style={{ padding: 16, borderRadius: 4, border: '1px solid #ccc', fontSize: 20 }}
          required
          aria-label="모임 날짜/시간"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          style={{ padding: 16, borderRadius: 4, border: '1px solid #ccc', fontSize: 20 }}
          required
          aria-label="카테고리"
          aria-describedby="category-desc"
        >
          {Object.keys(CATEGORYLABELS).map(key => (
            <option key={key} value={key}>
              {CATEGORYLABELS[key]}
            </option>
          ))}
        </select>
        <div id="category-desc" style={{ marginTop: 4, color: '#333', fontSize: 16 }}>
          {CATEGORYDESCS[category]}
        </div>
        <input
          type="number"
          placeholder="최대 참여 인원 (선택)"
          value={maxParticipants}
          onChange={(e) => setMaxParticipants(e.target.value)}
          style={{ padding: 16, borderRadius: 4, border: '1px solid #ccc', fontSize: 20 }}
          min="1"
          aria-label="최대 참여 인원"
        />
        <div
          style={{
            border: '2px dashed #1976d2',
            borderRadius: 8,
            padding: 16,
            background: '#f8f9fa',
            textAlign: 'center',
            cursor: 'pointer',
            fontSize: 18,
          }}
          onClick={() => document.getElementById('meeting-file-upload').click()}
          tabIndex={0}
          aria-label="파일 첨부 영역"
        >
          <span role="img" aria-label="파일">📎</span> 파일을 이곳에 끌어다 놓거나, <b>클릭</b>해서 첨부
          <input
            id="meeting-file-upload"
            type="file"
            multiple
            accept="image/*,application/pdf"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            disabled={uploading || files.length >= MAX_FILES}
          />
        </div>
        <div
          style={{
            fontSize: 15,
            color: '#555',
            margin: '4px 0',
            lineHeight: 1.6,
            background: '#f8f9fa',
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid #eee',
          }}
        >
          <b>첨부파일 안내</b><br />
          - <b>지원 파일:</b> 이미지(jpg, png, gif), PDF<br />
          - <b>최대 5개, 각 10MB 이하</b>만 첨부 가능<br />
          - 이미지는 미리보기가 제공됩니다.<br />
          - PDF는 파일명 클릭 시 새 창에서 확인<br />
          - 파일 옆 <span style={{ color: '#1976d2' }}>❌</span> 버튼으로 삭제<br />
          - <b>Cloudinary 자동 업로드:</b> 첨부 시 즉시 업로드
        </div>
        {uploading && <div style={{ color: '#1976d2', fontSize: 16 }}>파일 업로드 중...</div>}
        {uploadError && <div style={{ color: 'red', fontSize: 16 }}>{uploadError}</div>}
        {files.length > 0 && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
            {files.map((file, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {file.type.startsWith('image/') ? (
                  <img src={file.url} alt={file.originalName} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }} />
                ) : (
                  <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2', textDecoration: 'underline', fontSize: 16 }}>
                    {file.originalName}
                  </a>
                )}
                <span style={{ fontSize: 12, color: '#888' }}>{Math.round((file.size || 0) / 1024)}KB</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(idx)}
                  style={{ color: '#dc3545', border: 'none', background: 'none', cursor: 'pointer', fontSize: 20 }}
                  aria-label="첨부파일 삭제"
                >
                  ❌
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          type="submit"
          style={{
            padding: '16px 0',
            background: isLoading ? '#999' : '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 22,
            fontWeight: 'bold',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            marginTop: 16,
            width: '100%',
            minHeight: 56,
            transition: 'background 0.2s'
          }}
          disabled={isLoading || uploading}
          aria-disabled={isLoading || uploading}
        >
          {isLoading ? '저장 중...' : '모임 만들기'}
        </button>
      </form>
      <style>
        {`
          @media (max-width: 900px) {
            .meeting-form-container {
              max-width: 100vw !important;
              min-width: 0 !important;
              padding: 12px !important;
            }
            input, textarea, select, button {
              font-size: 16px !important;
            }
          }
        `}
      </style>
    </div>
  );
};

export default MeetingForm;