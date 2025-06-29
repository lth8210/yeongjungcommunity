// src/utils/findOrCreateOneToOneRoom.js
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

export async function findOrCreateOneToOneRoom(myUid, myName, myNickname, otherUid, otherName, otherNickname) {
  const participants = [myUid, otherUid].sort();
  // Firestore에서 배열 where는 순서까지 일치해야 하므로, participants를 항상 정렬!
  const q = query(
    collection(db, "chatRooms"),
    where("participants", "==", participants),
    where("isGroupChat", "==", false)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    return snap.docs[0].id;
  }

  // 방이 없으면 새로 생성
  const docRef = await addDoc(collection(db, "chatRooms"), {
    participants,
    participantNames: [myName, otherName],
    participantNicknames: [myNickname, otherNickname],
    isGroupChat: false,
    createdBy: myUid,
    lastRead: { [myUid]: new Date() },
    updatedAt: serverTimestamp()
  });
  return docRef.id;
}