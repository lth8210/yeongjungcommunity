import { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { db } from '../firebase';
import { doc, setDoc, getDoc } from "firebase/firestore";

const Auth = () => {
  const [realName, setRealName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);

  const auth = getAuth();

  const handleSignUp = async () => {
    if (!realName || !nickname || !email || !password) {
      setError("이름, 닉네임, 이메일, 비밀번호를 모두 입력해주세요.");
      return;
    }
    try {
      setError('');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        name: realName,
        nickname: nickname,
        email: user.email,
        phone: phone || '',
        createdAt: new Date(),
        isDisabled: false,
      });

      alert('회원가입에 성공했습니다!');
      setIsSigningUp(false);
    } catch (error) {
      setError(error.message);
      console.error("회원가입 오류:", error);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    try {
      setError('');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      if (userDoc.exists() && userDoc.data().isDisabled) {
        await auth.signOut();
        setError("이 계정은 관리자에 의해 비활성화되었습니다. 관리자에게 문의하세요.");
        return;
      }

      // 로그인 성공 시 App.js의 onAuthStateChanged가 처리함
    } catch (error) {
      setError(error.message);
      console.error("로그인 오류:", error);
    }
  };

  return (
    <div className="auth-container">
      {isSigningUp ? (
        <>
          <h2>회원가입</h2>
          <input type="text" placeholder="이름 (실명)" value={realName} onChange={(e) => setRealName(e.target.value)} />
          <input type="text" placeholder="닉네임 (표시 이름)" value={nickname} onChange={(e) => setNickname(e.target.value)} />
          <input type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="tel" placeholder="전화번호 (선택)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input type="password" placeholder="비밀번호 (6자리 이상)" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="button-group-center">
            <button onClick={handleSignUp}>가입하기</button>
          </div>
          <p className="auth-toggle" onClick={() => setIsSigningUp(false)}>이미 계정이 있으신가요? 로그인</p>
        </>
      ) : (
        <>
          <h2>로그인</h2>
          <input type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="button-group-center">
            <button onClick={handleSignIn}>로그인</button>
          </div>
          <p className="auth-toggle" onClick={() => setIsSigningUp(true)}>계정이 없으신가요? 회원가입</p>
        </>
      )}
      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

export default Auth;