// src/lib/logbook.ts
import { auth, db, storage } from "./firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Firestore 里每条攀岩记录的类型
 */
export interface RouteRecord {
  id?: string;
  uid?: string;
  imageUrl?: string;
  difficulty: string; // e.g. "V3"
  date: string;       // ISO: "YYYY-MM-DD"
  location: string;
  rating: number;
  notes: string;
  createdAt?: any;    // Firestore Timestamp
}

/**
 * 保存一条攀岩记录到 Firestore
 */
export async function saveRouteToFirestore(input: {
  file?: File | null;
  difficulty: string;
  date: string;      // ISO
  location: string;
  rating: number;
  notes: string;
}) {
  const user = auth.currentUser;
  if (!user) throw new Error("User not logged in");

  let imageUrl = "";
  if (input.file) {
    const fileRef = ref(
      storage,
      `routes/${user.uid}/${Date.now()}_${input.file.name}`
    );
    await uploadBytes(fileRef, input.file);
    imageUrl = await getDownloadURL(fileRef);
  }

  await addDoc(collection(db, "logbook"), {
    uid: user.uid,
    imageUrl,
    difficulty: input.difficulty,
    date: input.date,
    location: input.location,
    rating: input.rating,
    notes: input.notes,
    createdAt: serverTimestamp(),
  });
}

/**
 * 监听当前用户的路线记录变化
 * 注意：这里用 userId 作为参数，而不是直接用 auth.currentUser，避免竞态问题
 */
export function listenRoutesForUser(
  userId: string,
  cb: (rows: RouteRecord[]) => void
) {
  const q1 = query(collection(db, "logbook"), where("uid", "==", userId));

  return onSnapshot(
    q1,
    (snap) => {
      const rows = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as RouteRecord[];

      // 本地按 createdAt 排序（新纪录在前）
      rows.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      });

      cb(rows);
    },
    (err) => {
      console.error("onSnapshot error:", err);
      cb([]); // 出错时返回空数组，前端可以 fallback 到本地 demo
    }
  );
}

/* ------------------- 新用户 demo 数据 ------------------- */

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/**
 * 如果该用户在 logbook 里还没有任何记录，就自动插入几条 demo route
 * 在 LogbookPage.tsx 里，登录后调用：await seedDemoRoutesIfEmpty(user.uid)
 */
export async function seedDemoRoutesIfEmpty(userId: string) {
  // 先查一下这个用户有没有记录
  const q1 = query(
    collection(db, "logbook"),
    where("uid", "==", userId),
    limit(1)
  );

  const snap = await getDocs(q1);
  if (!snap.empty) {
    // 已经有数据了，直接返回，不再写 demo
    return;
  }

  const now = new Date();
  const oneDay = 86400000;

  const demos = [
    {
      difficulty: "V4",
      date: isoDate(now),
      location: "Boulder Gym",
      rating: 5,
      notes: "Nailed it! Perfect technique 💪",
    },
    {
      difficulty: "V3",
      date: isoDate(new Date(Date.now() - oneDay)),
      location: "Climb Zone",
      rating: 4,
      notes: "Challenging start sequence",
    },
    {
      difficulty: "V5",
      date: isoDate(new Date(Date.now() - 2 * oneDay)),
      location: "Boulder Gym",
      rating: 3,
      notes: "Almost sent it!",
    },
    {
      difficulty: "V2",
      date: isoDate(new Date(Date.now() - 7 * oneDay)),
      location: "Rock Hall",
      rating: 5,
      notes: "Nice warm-up route ✨",
    },
  ];

  // 批量写入 demo 数据（无图片，前端用默认 sample 图）
  await Promise.all(
    demos.map((demo) =>
      addDoc(collection(db, "logbook"), {
        uid: userId,
        imageUrl: "", // 让前端 fallback 到默认 climbingWallSample
        difficulty: demo.difficulty,
        date: demo.date,
        location: demo.location,
        rating: demo.rating,
        notes: demo.notes,
        createdAt: serverTimestamp(),
      })
    )
  );
}
