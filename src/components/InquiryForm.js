import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const InquiryForm = ({ onInquiryAdded, userInfo }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 파일 업로드 상태
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Drag & Drop 핸들러
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files.length > 0) handleFileChange({ target: { files: e.dataTransfer.files } });
  };

  // 파일 업로드 핸들러
  const handleFileChange = async (e) => {
    const filesArray = Array.from(e.target.files);
    if (filesArray.length === 0) return;
    setUploading(true);
    setUploadError('');
    const uploadedFiles = [];
    try {
      for (const file of filesArray) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "yeongjung_preset");
        const res = await fetch("https://api.cloudinary.com/v1_1/dqrcyclit/auto/upload", {
          method: "POST",
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
          throw new Error(data.error?.message || "Cloudinary 업로드 실패");
        }
      }
      setFiles(prev => [...prev, ...uploadedFiles]);
    } catch (err) {
      setUploadError("파일 업로드 중 오류: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // 개별 파일 삭제
  const handleRemoveFile = (idx) => {
    setFiles(files.filter((_, i) => i !== idx));
  };

  // 문의 제출
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    if (uploading) {
      alert("파일 업로드가 끝날 때까지 기다려주세요.");
      return;
    }
    try {
      setSubmitting(true);
      await addDoc(collection(db, 'inquiries'), {
        title,
        content,
        userName: userInfo?.name || '익명',
        userId: userInfo?.uid || '',
        createdAt: serverTimestamp(),
        status: 'waiting',
        isPrivate: isPrivate,
        files,
      });
      setTitle('');
      setContent('');
      setFiles([]);
      setIsPrivate(false);
      if (onInquiryAdded) onInquiryAdded();
    } catch (error) {
      alert('문의 제출 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-main"
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={handleDrop}
    >
      <input
        type="text"
        placeholder="문의 제목"
        value={title}
        onChange={e => setTitle(e.target.value)}
        required
        style={{ marginBottom: 8 }}
      />
      <textarea
        placeholder="문의 내용을 입력해주세요."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
        style={{ minHeight: 80, marginBottom: 8 }}
      />
      {/* 비공개 문의 체크 */}
      <label style={{ display: 'block', margin: '8px 0' }}>
        <input
          type="checkbox"
          checked={isPrivate}
          onChange={e => setIsPrivate(e.target.checked)}
          style={{ marginRight: 4 }}
        />
        비공개 문의 (관리자와 본인만 볼 수 있습니다)
      </label>
      {/* Drag & Drop/첨부 안내 */}
      <div
        style={{
          border: '2px dashed #1976d2',
          borderRadius: 8,
          padding: 12,
          background: '#f8f9fa',
          marginBottom: 8,
          textAlign: 'center',
          cursor: 'pointer'
        }}
        onClick={() => document.getElementById('inquiry-file-upload').click()}
      >
        <span role="img" aria-label="파일">📎</span>  
        파일을 이곳에 끌어다 놓거나, <b>클릭</b>해서 첨부
        <input
          id="inquiry-file-upload"
          type="file"
          multiple
          accept="image/*,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
      <div style={{
        fontSize: 13,
        color: "#555",
        margin: "4px 0 8px 0",
        lineHeight: 1.6,
        background: "#f8f9fa",
        padding: "8px 12px",
        borderRadius: 6,
        border: "1px solid #eee"
      }}>
        <b>첨부파일 안내</b><br />
        - <b>지원 파일:</b> 이미지(jpg, png, gif), PDF<br />
        - <b>최대 5개, 각 10MB 이하</b>만 첨부할 수 있습니다.<br />
        - 이미지는 미리보기가 제공됩니다.<br />
        - PDF는 파일명 클릭 시 새 창에서 확인됩니다.<br />
        - 파일 옆 <span style={{ color: "#1976d2" }}>❌</span> 버튼으로 개별 삭제<br />
        - <b>Cloudinary 자동 업로드:</b> 파일을 첨부하면 즉시 업로드됩니다.
      </div>
      {uploading && <div style={{ color: "#1976d2", fontSize: 14, marginTop: 4 }}>파일 업로드 중...</div>}
      {uploadError && <div style={{ color: "red", fontSize: 14, marginTop: 4 }}>{uploadError}</div>}
      {files.length > 0 && (
        <div className="file-preview-list">
          {files.map((file, idx) => (
            <div className="file-preview-item" key={idx}>
              {file.type.startsWith('image/') ? (
                <img src={file.url} alt={file.originalName} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }} />
              ) : (
                <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2', textDecoration: 'underline' }}>
                  {file.originalName}
                </a>
              )}
              <span style={{ fontSize: 12, color: '#888', marginLeft: 4 }}>
                {Math.round((file.size || 0) / 1024)}KB
              </span>
              <button
                type="button"
                onClick={() => handleRemoveFile(idx)}
                className="file-delete-btn"
              >❌</button>
            </div>
          ))}
        </div>
      )}
      <button type="submit" style={{ marginTop: 12 }} disabled={submitting || uploading}>
        {submitting ? '제출 중...' : '문의 제출'}
      </button>
    </form>
  );
};

export default InquiryForm;