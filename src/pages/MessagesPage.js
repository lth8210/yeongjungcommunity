import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

function MessagesPage({ userInfo }) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!userInfo?.uid) return;
    const q = query(
      collection(db, "messages"),
      where("to", "==", userInfo.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [userInfo]);

  return (
    <div>
      <h2>받은 쪽지함</h2>
      <ul>
        {messages.map(msg => (
          <li key={msg.id}>
            <b>{msg.userName || msg.uid}:</b> {msg.text}
            <span style={{ color: "#888", marginLeft: 8 }}>
              {msg.createdAt?.toDate().toLocaleString?.() || ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default MessagesPage;