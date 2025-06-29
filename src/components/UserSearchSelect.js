import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const UserSearchSelect = ({
  selectedUids,
  setSelectedUids,
  setSelectedNames,
  setSelectedNicknames
}) => {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [filtered, setFiltered] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, 'users'));
      setUsers(snap.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })));
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    setFiltered(
  users.filter(
    u =>
      (u.nickname && u.nickname.toLowerCase().includes(query.toLowerCase())) ||
      (u.name && u.name.toLowerCase().includes(query.toLowerCase()))
  )
);
  }, [query, users]);

  const handleSelect = (user) => {
    if (selectedUids.includes(user.uid)) return;
    setSelectedUids(prev => [...prev, user.uid]);
    setSelectedNames(prev => [...prev, user.name || user.nickname || user.email]);
    setSelectedNicknames(prev => [...prev, user.nickname || user.name || user.email]);
  };

  const handleRemove = (uid) => {
    setSelectedUids(prev => prev.filter(id => id !== uid));
    setSelectedNames((prev, idx) => prev.filter((_, i) => users.findIndex(u => u.uid === uid) !== i));
    setSelectedNicknames((prev, idx) => prev.filter((_, i) => users.findIndex(u => u.uid === uid) !== i));
  };

  return (
    <div>
      <input
  type="text"
  placeholder="닉네임/이름 검색"
  value={query}
  onChange={e => setQuery(e.target.value)}
  style={{ width: '100%', padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
/>
      {filtered.length > 0 && (
        <ul style={{ border: '1px solid #ccc', borderRadius: 4, margin: 0, padding: 0, maxHeight: 120, overflowY: 'auto' }}>
          {filtered.map(user => (
            <li
              key={user.uid}
              style={{ padding: 8, cursor: 'pointer', background: selectedUids.includes(user.uid) ? '#e7f1ff' : '#fff' }}
              onClick={() => handleSelect(user)}
            >
              {user.nickname} ({user.name})
            </li>
          ))}
        </ul>
      )}
      {selectedUids.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <b>선택된 참여자:</b>
          <ul style={{ display: 'flex', gap: 8, listStyle: 'none', padding: 0 }}>
            {selectedUids.map((uid, idx) => {
  const user = users.find(u => u.uid === uid);
  return (
    <li key={uid} style={{ background: '#eee', borderRadius: 4, padding: '2px 8px' }}>
      {user?.nickname || user?.name}
      <button onClick={() => handleRemove(uid)} style={{ marginLeft: 4, color: 'red', border: 'none', background: 'transparent', cursor: 'pointer' }}>x</button>
    </li>
  );
})}
          </ul>
        </div>
      )}
    </div>
  );
};

export default UserSearchSelect;