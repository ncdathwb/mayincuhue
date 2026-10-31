// Đăng nhập quản trị cho trang tĩnh. Link Google Sheets được mã hoá bằng tài khoản + mật khẩu
// (AES-GCM, khoá tạo bằng PBKDF2), nên trong code không có link lẫn mật khẩu: nhập đúng mới giải mã ra link.
// Đổi tài khoản, mật khẩu hoặc link thì phải tạo lại 3 giá trị salt/iv/data bên dưới.
const KHOA_ADMIN = {
  salt: "Am+3ZYaSFKmCB3W+BxNbJQ==",
  iv: "bd16Ke7oEgvV4ELG",
  data: "mqTDtlnwK0v6SbctPwoKVU0jXy1rYnWQzcwlXIWhnFlH/ROXYAl8S+aQ9sB6C6rxOw5eqnXVSuupRSgz8mvmTYyiEg35wYvL5jkW16iStnTewKAvOAKnjN3B77dSDDbmJGLWau77gFewUfMuSQRHA8dgj2MPJ2F7O8K+8WO6e5euMLkOYIgQO1y4",
  lap: 250000,
};

/** Trả link Google Sheets nếu đúng tài khoản + mật khẩu, sai thì trả null. */
async function moKhoaAdmin(user, pass) {
  const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const text = new TextEncoder().encode(`${user.trim().toLowerCase()}\n${pass}`);
  const base = await crypto.subtle.importKey("raw", text, "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: bytes(KHOA_ADMIN.salt), iterations: KHOA_ADMIN.lap },
    base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(KHOA_ADMIN.iv) }, key, bytes(KHOA_ADMIN.data));
    return new TextDecoder().decode(plain);
  } catch {
    return null; // sai tài khoản hoặc mật khẩu thì khoá sai, AES-GCM từ chối giải mã
  }
}
