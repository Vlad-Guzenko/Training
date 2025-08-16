import { notifications } from "@mantine/notifications";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence,
  type User,
  signInWithRedirect,
} from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

setPersistence(auth, browserLocalPersistence).catch(() => {});
enableIndexedDbPersistence(db).catch(() => {}); // если второй таб — это ок

const provider = new GoogleAuthProvider();
export async function signInWithGoogle() {
  try {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithPopup(auth, provider);
  } catch (e: any) {
    const code = e?.code ?? "unknown";
    const msg = e?.message ?? String(e);
    // Показать, что именно пошло не так
    notifications.show({
      title: "Вход не удался",
      message: `${code}: ${msg}`,
      color: "red",
    });

    // Частые случаи — пробуем редирект, он надёжнее в мобильных браузерах/при блокировщиках
    if (
      code === "auth/popup-blocked" ||
      code === "auth/popup-closed-by-user" ||
      code === "auth/web-storage-unsupported" ||
      code === "auth/unauthorized-domain"
    ) {
      try {
        notifications.show({
          title: "Пробую альтернативный вход",
          message: "Перенаправление через Google…",
          color: "indigo",
        });
        await signInWithRedirect(auth, provider);
      } catch (e2: any) {
        notifications.show({
          title: "Редирект тоже не удался",
          message: `${e2?.code ?? ""} ${e2?.message ?? ""}`,
          color: "red",
        });
      }
    }
  }
}
export const signOutGoogle = () => signOut(auth);
export const onAuth = (cb: (u: User | null) => void) =>
  onAuthStateChanged(auth, cb);
