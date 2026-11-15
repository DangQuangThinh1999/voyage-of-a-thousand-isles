// Cấu hình đám mây cho Hải Trình Vạn Đảo — xem hướng dẫn trong CLOUD_SETUP.md
// Để trống (firebase: null) thì game chạy bình thường, chỉ lưu trên trình duyệt.
// Các giá trị firebase dưới đây là cấu hình CÔNG KHAI của web app (được phép để trong code).
// TUYỆT ĐỐI KHÔNG để khóa bí mật thanh toán (PayOS API key / checksum key) ở file này.
window.CLOUD_CONFIG = {
  firebase: {
    apiKey: "AIzaSyCLUTijXuzf19nmDCMwqhGQCZPr3txl-fY",
    authDomain: "voyage-of-a-thousand-isles.firebaseapp.com",
    projectId: "voyage-of-a-thousand-isles",
    storageBucket: "voyage-of-a-thousand-isles.firebasestorage.app",
    messagingSenderId: "558511517970",
    appId: "1:558511517970:web:93ec9bdd9eba93bd2503cb"
  },
  // firebase: {
  //   apiKey: "....",
  //   authDomain: "ten-du-an.firebaseapp.com",
  //   projectId: "ten-du-an",
  //   storageBucket: "ten-du-an.appspot.com",
  //   messagingSenderId: "....",
  //   appId: "...."
  // },
  region: 'asia-southeast1',
  // Gói nạp xu — phải KHỚP với PACKS trong functions/index.js (máy chủ mới là nơi quyết định giá)
  packs: [
    { id: 'p10',  vnd: 10000,  xu: 10 },
    { id: 'p50',  vnd: 50000,  xu: 55 },
    { id: 'p100', vnd: 100000, xu: 120 },
    { id: 'p200', vnd: 200000, xu: 260 }
  ]
};
