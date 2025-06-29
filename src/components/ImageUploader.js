import React, { useState } from 'react';
import axios from 'axios';

function ImageUploader({ onUpload, maxFiles = 5, accept = "image/*,application/pdf" }) {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);

  // 파일 선택 및 미리보기
  const handleFileChange = e => {
    const selectedFiles = Array.from(e.target.files).slice(0, maxFiles);
    setFiles(selectedFiles);

    // 미리보기(이미지만)
    const previewPromises = selectedFiles.map(file => {
      if (file.type.startsWith('image/')) {
        return new Promise(resolve => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
      } else {
        // 이미지가 아니면 미리보기 대신 파일명만 표시
        return Promise.resolve(null);
      }
    });

    Promise.all(previewPromises).then(setPreviews);
  };

  // Cloudinary 업로드
  const handleUpload = async () => {
    if (files.length === 0) return alert('파일을 선택하세요!');
    setUploading(true);

    try {
      const uploadPromises = files.map(async file => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'yeongjung_preset'); // 본인 preset 이름
        const res = await axios.post(
          'https://api.cloudinary.com/v1_1/dqrcyclit/auto/upload', // auto: 이미지/문서 모두 지원
          formData
        );
        // 이미지/파일 모두 secure_url 반환
        return {
          url: res.data.secure_url,
          originalName: file.name,
          type: file.type
        };
      });

      const uploaded = await Promise.all(uploadPromises);
      alert('업로드 성공!');
      setUploading(false);
      setFiles([]);
      setPreviews([]);

      // 여러 개면 배열, 1개면 객체 1개만 반환
      if (onUpload) {
        onUpload(maxFiles === 1 ? uploaded[0] : uploaded);
      }
    } catch (err) {
      console.error('업로드 실패:', err);
      alert('업로드 실패');
      setUploading(false);
    }
  };

  return (
    <div style={{ margin: '16px 0', padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
      <h4>이미지/파일 업로드</h4>
      <input
        type="file"
        accept={accept}
        multiple={maxFiles > 1}
        onChange={handleFileChange}
        style={{ marginBottom: 8 }}
      />
      {previews.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {previews.map((preview, idx) =>
            preview ? (
              <img
                key={idx}
                src={preview}
                alt={`미리보기 ${idx + 1}`}
                style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 4 }}
              />
            ) : (
              <div key={idx} style={{ width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ccc', borderRadius: 4 }}>
                <span>{files[idx]?.name}</span>
              </div>
            )
          )}
        </div>
      )}
      <button
        onClick={handleUpload}
        disabled={uploading || files.length === 0}
        style={{
          background: uploading ? '#ccc' : '#1976d2',
          color: '#fff',
          border: 'none',
          padding: '8px 16px',
          borderRadius: 4,
          cursor: uploading ? 'not-allowed' : 'pointer'
        }}
      >
        {uploading ? '업로드 중...' : 'Cloudinary에 업로드'}
      </button>
    </div>
  );
}

export default ImageUploader;