const express = require("express");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");
const admin = require("firebase-admin");
dotenv.config();

// ▼ 추가: 서비스계정 환경변수 또는 파일 둘 다 지원
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  serviceAccount = require("./serviceAccountKey.json");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();

// ▼ 추가: CORS를 배포/개발 도메인으로 제한(필요시 더 추가)
app.use(cors({
  origin: [
    "https://yeongjungcommunity.web.app",
    "http://localhost:3000"
  ]
}));

app.use(express.json());

// ▼ 추가: 헬스 체크 엔드포인트
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

app.post('/auth/kakao/callback', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Authorization code missing" });

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', process.env.KAKAO_CLIENT_ID);
    params.append('redirect_uri', process.env.KAKAO_REDIRECT_URI);
    params.append('code', code);
    if (process.env.KAKAO_CLIENT_SECRET) {
      params.append('client_secret', process.env.KAKAO_CLIENT_SECRET);
    }

    const tokenRes = await axios.post('https://kauth.kakao.com/oauth/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const kakaoAccessToken = tokenRes.data.access_token;

    const userRes = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${kakaoAccessToken}` },
    });
    const kakaoUser = userRes.data;

    const kakaoUid = `kakao_${kakaoUser.id}`;
    const customToken = await admin.auth().createCustomToken(kakaoUid);

    res.json({ customToken });
  } catch (error) {
    console.error('카카오 로그인 처리 실패:', error.response?.data || error.message);
    res.status(500).json({ error: '카카오 로그인 처리 중 오류 발생' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});