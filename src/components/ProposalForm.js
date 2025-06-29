import { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const CATEGORY_LABELS = {
  environment: '환경',
  welfare: '복지',
  event: '행사',
  etc: '기타',
};

const ProposalForm = ({ onProposalAdded, userInfo }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('etc');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Drag & Drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files.length > 0) handleFileChange({ target: { files: e.dataTransfer.files } });
  };

  // Cloudinary 업로드
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

  const handleRemoveFile = (idx) => {
    setFiles(files.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      alert("제안을 작성하려면 로그인이 필요합니다.");
      return;
    }
    if (!title || !content) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    try {
      await addDoc(collection(db, "proposals"), {
        title: title,
        content: content,
        category: category || 'etc',
        authorId: user.uid,
        authorEmail: user.email,
        createdAt: serverTimestamp(),
        status: 'pending',
        files,
      });
      alert("제안이 성공적으로 등록되었습니다. 관리자 검토 후 게시됩니다.");
      setTitle('');
      setContent('');
      setCategory('etc');
      setFiles([]);
      if (onProposalAdded) onProposalAdded();
    } catch (error) {
      console.error("제안 등록 중 오류: ", error);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="form-main"
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={handleDrop}
      style={{
        maxWidth: 700,
        margin: '0 auto',
        padding: 16,
        background: '#fff',
        borderRadius: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}
      aria-label="새로운 제안 작성 폼"
    >
      <h3 style={{ fontSize: 24, marginBottom: 12 }}>새로운 제안 작성하기</h3>
      <label htmlFor="proposal-title" style={{ fontWeight: 'bold', fontSize: 16 }}>제안 제목</label>
      <input 
        id="proposal-title"
        type="text" 
        placeholder="제안 제목" 
        value={title} 
        onChange={(e) => setTitle(e.target.value)}
        style={{ marginBottom: 12, padding: 12, borderRadius: 4, border: '1px solid #ccc', fontSize: 17 }}
        required
        aria-required="true"
      />
      <label htmlFor="proposal-content" style={{ fontWeight: 'bold', fontSize: 16 }}>제안 내용</label>
      <textarea 
        id="proposal-content"
        placeholder="제안 내용" 
        value={content}
        onChange={(e) => setContent(e.target.value)}
        style={{ minHeight: 80, marginBottom: 12, padding: 12, borderRadius: 4, border: '1px solid #ccc', fontSize: 17 }}
        required
        aria-required="true"
      />
      <label htmlFor="proposal-category" style={{ fontWeight: 'bold', fontSize: 16 }}>카테고리</label>
      <select
        id="proposal-category"
        value={category}
        onChange={e => setCategory(e.target.value)}
        style={{ marginBottom: 12, padding: 12, borderRadius: 4, border: '1px solid #ccc', fontSize: 17 }}
        required
        aria-required="true"
      >
        {Object.keys(CATEGORY_LABELS).map(key => (
          <option key={key} value={key}>{CATEGORY_LABELS[key]}</option>
        ))}
      </select>
      <div
        style={{
          border: '2px dashed #1976d2',
          borderRadius: 8,
          padding: 12,
          background: '#f8f9fa',
          marginBottom: 8,
          textAlign: 'center',
          cursor: 'pointer',
          fontSize: 16
        }}
        onClick={() => document.getElementById('proposal-file-upload').click()}
        tabIndex={0}
        aria-label="파일 첨부 영역"
      >
        <span role="img" aria-label="파일">📎</span>  
        파일을 이곳에 끌어다 놓거나, <b>클릭</b>해서 첨부
        <input
          id="proposal-file-upload"
          type="file"
          multiple
          accept="image/*,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
      <div style={{
        fontSize: 14,
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
      {uploading && <div style={{ color: "#1976d2", fontSize: 15, marginTop: 4 }}>파일 업로드 중...</div>}
      {uploadError && <div style={{ color: "red", fontSize: 15, marginTop: 4 }}>{uploadError}</div>}
      {files.length > 0 && (
        <div className="file-preview-list" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {files.map((file, idx) => (
            <div className="file-preview-item" key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
                style={{ color: '#dc3545', border: 'none', background: 'none', cursor: 'pointer', fontSize: 18 }}
                aria-label="첨부파일 삭제"
              >❌</button>
            </div>
          ))}
        </div>
      )}
      <button
        type="submit"
        style={{
          marginTop: 16,
          padding: '12px 0',
          width: '100%',
          background: '#1976d2',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          fontSize: 20,
          fontWeight: 'bold',
          cursor: uploading ? 'not-allowed' : 'pointer'
        }}
        disabled={uploading}
      >
        제안하기
      </button>
    </form>
  );
};

export default ProposalForm;