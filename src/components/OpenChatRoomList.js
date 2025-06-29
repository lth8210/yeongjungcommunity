import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';

const OpenChatRoomList = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'openChatRooms'));
        const roomList = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRooms(roomList);
      } catch (err) {
        console.error("오픈채팅방 목록 불러오기 오류:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  if (loading) return <div>오픈채팅방 목록을 불러오는 중...</div>;

  return (
    <div className="openchat-list-card" style={{ border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
      <h3>오픈채팅방 목록</h3>
      {rooms.length === 0 ? (
        <div style={{ color: '#888', fontSize: 15 }}>아직 생성된 오픈채팅방이 없습니다.</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {rooms.map(room => (
            <li key={room.id} style={{ marginBottom: 12, borderBottom: '1px solid #f1f3f5', paddingBottom: 8 }}>
              <Link
                to={`/openchat/${room.id}`}
                style={{ color: '#1976d2', textDecoration: 'underline', fontWeight: 600, fontSize: 16 }}
              >
                {room.roomName}
              </Link>
              <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>
                개설자: {room.createdByName} | 참여자 수: {room.participants?.length || 1}
              </div>
              <div style={{ fontSize: 12, color: '#aaa' }}>
                생성일: {room.createdAt?.toDate ? room.createdAt.toDate().toLocaleString() : ''}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default OpenChatRoomList;