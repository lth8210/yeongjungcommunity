import { useState, useRef, useEffect } from 'react';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { db } from '../firebase';
import { doc, setDoc, getDoc } from "firebase/firestore";

const Auth = ({ globalFontSize }) => {
  const [realName, setRealName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [agreePolicy, setAgreePolicy] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [termsText, setTermsText] = useState('');
  const [privacyText, setPrivacyText] = useState('');
  const modalRef = useRef(null);
  
  // ✅ 접근성: ESC 닫기 + Tab 키 포커스 트랩 + 모달 열릴 시 포커스 이동
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowModal(false);

      // 접근성: Tab 키로 모달 내부 순환
      if (e.key === 'Tab' && showModal && modalRef.current) {
        const focusableEls = modalRef.current.querySelectorAll(
          'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        const firstEl = focusableEls[0];
        const lastEl = focusableEls[focusableEls.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    };

    if (showModal) {
      window.addEventListener('keydown', handleKeyDown);
      if (modalRef.current) modalRef.current.focus();
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showModal]);

  const fetchAgreements = async () => {
  try {
    const termsDoc = await getDoc(doc(db, 'policies', 'terms'));       // ✅ 수정됨
    const privacyDoc = await getDoc(doc(db, 'policies', 'privacy'));   // ✅ 수정됨

    if (termsDoc.exists()) setTermsText(termsDoc.data().content || '');
    if (privacyDoc.exists()) setPrivacyText(privacyDoc.data().content || '');
  } catch (error) {
    console.error("약관/방침 불러오기 오류:", error);
  }
};

  const auth = getAuth();

  const handleSignUp = async () => {
    if (!realName || !nickname || !email || !password || !phone) {
      setError("이름, 닉네임, 이메일, 전화번호, 비밀번호를 모두 입력해주세요.");
      return;
    }
    if (!agreePolicy) {
      setError("개인정보 수집 및 이용에 동의하셔야 회원가입이 가능합니다.");
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
    } catch (error) {
      setError(error.message);
      console.error("로그인 오류:", error);
    }
  };

  return (
    <form
      className="auth-container"
      onSubmit={(e) => {
        e.preventDefault();
        isSigningUp ? handleSignUp() : handleSignIn();
      }}
    >
      {isSigningUp ? (
        <>
          <h2>회원가입</h2>
          <input type="text" placeholder="이름 (실명)" value={realName} onChange={(e) => setRealName(e.target.value)} />
          <input type="text" placeholder="닉네임 (표시 이름)" value={nickname} onChange={(e) => setNickname(e.target.value)} />
          <input type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="tel" placeholder="전화번호" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <input type="password" placeholder="비밀번호 (6자리 이상)" value={password} onChange={(e) => setPassword(e.target.value)} />
          <label style={{ display: 'block', marginTop: '10px' }}>
            <input
              type="checkbox"
              checked={agreePolicy}
              onChange={(e) => setAgreePolicy(e.target.checked)}
              required
            />
            &nbsp;
            <span>
              [필수] 본인은{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer">이용약관</a>과{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer">개인정보처리방침</a>에 동의합니다.
            </span>
            <button
              type="button"
              onClick={() => {
                fetchAgreements();
                setShowModal(true);
              }}
              style={{ marginLeft: '10px' }}
            >
              전문 보기
            </button>
          </label>
          <div className="button-group-center">
            <button type="submit">가입하기</button>
          </div>
          <p className="auth-toggle" onClick={() => setIsSigningUp(false)}>이미 계정이 있으신가요? 로그인</p>
        </>
      ) : (
        <>
          <h2>로그인</h2>
          <input type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="button-group-center">
            <button type="submit">로그인</button>
          </div>
          <p className="auth-toggle" onClick={() => setIsSigningUp(true)}>계정이 없으신가요? 회원가입</p>
        </>
      )}

      {error && <p className="error-message">{error}</p>}

      {showModal && (
  <div className="modal-backdrop" onClick={() => setShowModal(false)}>
    <div
      className="modal-content"
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="agreementTitle"
      tabIndex={-1}
    >

      <h3 id="agreementTitle">이용약관</h3>
      <div className="policy-text" style={{ fontSize: globalFontSize }}>
  <pre>{termsText}</pre>
</div>

      <h3>개인정보처리방침</h3>
      <div className="policy-text" style={{ fontSize: globalFontSize }}>
  <pre>{privacyText}</pre>
</div>

      <button onClick={() => setShowModal(false)}>닫기</button>
    </div>
  </div>
)}
    </form>
  );
};

export default Auth;