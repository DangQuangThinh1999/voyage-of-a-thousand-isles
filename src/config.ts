// Cấu hình Firebase (công khai, được phép để trong code). Đặt firebase: null để tắt đăng nhập.
export interface FirebaseConfig {
  apiKey: string; authDomain: string; projectId: string; storageBucket: string; messagingSenderId: string; appId: string;
}
export const CLOUD_CONFIG: { firebase: FirebaseConfig | null } = {
  firebase: {
    apiKey: 'AIzaSyCLUTijXuzf19nmDCMwqhGQCZPr3txl-fY',
    authDomain: 'voyage-of-a-thousand-isles.firebaseapp.com',
    projectId: 'voyage-of-a-thousand-isles',
    storageBucket: 'voyage-of-a-thousand-isles.firebasestorage.app',
    messagingSenderId: '558511517970',
    appId: '1:558511517970:web:93ec9bdd9eba93bd2503cb',
  },
};
