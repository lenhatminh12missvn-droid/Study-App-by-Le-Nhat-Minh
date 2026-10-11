import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAZsQ8tpN8etdQCM4El43tVS0bXIW5C_NU",
  authDomain: "study-work-46ef5.firebaseapp.com",
  projectId: "study-work-46ef5",
  storageBucket: "study-work-46ef5.firebasestorage.app",
  messagingSenderId: "514974082929",
  appId: "1:514974082929:web:898aa29b441e607f9a78d0",
  measurementId: "G-TVCXKHPPCL"
};

const gate = document.getElementById('authGate');
const openBtn = document.getElementById('authOpenBtn');
const signInBtn = document.getElementById('googleSignInBtn');
const signOutBtn = document.getElementById('googleSignOutBtn');
const guestBtn = document.getElementById('continueGuestBtn');
const status = document.getElementById('authStatus');
const emailEl = document.getElementById('authUserEmail');
const nameEl = document.getElementById('miniName');
const avatarEl = document.getElementById('miniAvatar');

function showGate(show=true){ gate?.classList.toggle('open', show); }
openBtn?.addEventListener('click',()=>showGate(true));
guestBtn?.addEventListener('click',()=>showGate(false));

try {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  signInBtn?.addEventListener('click', async () => {
    signInBtn.disabled = true;
    status.textContent = 'Đang kết nối Google…';
    try {
      await signInWithPopup(auth, provider);
      status.textContent = 'Đăng nhập thành công.';
      showGate(false);
    } catch (err) {
      console.error('Google sign-in error:', err);
      const messages = {
        'auth/unauthorized-domain': 'Domain hiện tại chưa được cho phép. Thêm domain trong Firebase Authentication → Settings → Authorized domains.',
        'auth/popup-blocked': 'Trình duyệt đã chặn cửa sổ đăng nhập. Hãy cho phép popup rồi thử lại.',
        'auth/operation-not-allowed': 'Bạn chưa bật nhà cung cấp Google trong Firebase Authentication.',
        'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập.'
      };
      status.textContent = messages[err.code] || `Không thể đăng nhập (${err.code || 'lỗi không xác định'}). Hãy kiểm tra cấu hình Firebase và kết nối mạng.`;
    } finally { signInBtn.disabled = false; }
  });

  signOutBtn?.addEventListener('click', async () => {
    try { await signOut(auth); status.textContent = 'Đã đăng xuất.'; }
    catch (err) { status.textContent = 'Đăng xuất chưa thành công. Hãy thử lại.'; }
  });

  onAuthStateChanged(auth, user => {
    if (user) {
      openBtn.textContent = 'Tài khoản Google';
      emailEl.textContent = user.email || 'Đã đăng nhập';
      if (nameEl && user.displayName) nameEl.textContent = user.displayName;
      if (avatarEl && user.photoURL) { avatarEl.textContent = ''; avatarEl.style.backgroundImage = `url("${user.photoURL}")`; avatarEl.style.backgroundSize = 'cover'; avatarEl.style.backgroundPosition = 'center'; }
      signOutBtn.hidden = false;
      guestBtn.textContent = 'Đóng';
      status.textContent = `Đã đăng nhập${user.email ? ` với ${user.email}` : ''}.`;
    } else {
      openBtn.textContent = 'Đăng nhập Google';
      emailEl.textContent = 'Chưa đăng nhập';
      signOutBtn.hidden = true;
      guestBtn.textContent = 'Tiếp tục với tư cách khách';
    }
  });
} catch (err) {
  console.error('Firebase initialization error:', err);
  status.textContent = 'Không tải được Firebase SDK. Hãy kiểm tra Internet và mở ứng dụng qua localhost hoặc website HTTPS.';
}
