import { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, setDoc, doc } from "firebase/firestore";

const MeetingForm = ({ onMeetingAdded, userInfo }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const user = auth.currentUser;
    if (!user || !userInfo) {
      alert("모임을 만들려면 로그인이 필요합니다.");
      setIsLoading(false);
      return;
    }

    if (!title || !description || !location || !meetingTime) {
      alert("모든 필드를 입력해주세요.");
      setIsLoading(false);
      return;
    }

    try {
      const hostName = userInfo.name;

      const newMeetingRef = await addDoc(collection(db, "meetings"), {
        title: title,
        description: description,
        location: location,
        meetingTime: meetingTime,
        hostId: user.uid,
        hostName: hostName,
        createdAt: serverTimestamp(),
        applicants: [user.uid],
        pendingApplicants: [], // 승인제를 위해 빈 배열로 초기화
        maxParticipants: parseInt(maxParticipants) || null
      });

      await setDoc(doc(db, "chatRooms", newMeetingRef.id), {
        roomName: title,
        participants: [user.uid],
        participantNames: [hostName],
        lastMessage: '채팅방이 개설되었습니다.',
        updatedAt: serverTimestamp(),
        isGroupChat: true,
        meetingId: newMeetingRef.id
      });
      
      alert("새로운 모임과 채팅방이 만들어졌습니다!");
      setTitle('');
      setDescription('');
      setLocation('');
      setMeetingTime('');
      
      if (onMeetingAdded) {
        onMeetingAdded();
      }

    } catch (error) {
      console.error("모임/채팅방 생성 중 오류 발생: ", error);
      alert("모임 생성에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="meeting-form">
      <h3>새 모임 만들기</h3>
      <input type="text" placeholder="모임 제목" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea placeholder="모임 상세 설명" value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
      <input type="text" placeholder="모임 장소" value={location} onChange={(e) => setLocation(e.target.value)} />
      <input type="number" placeholder="최대 참여 인원 (예: 10)" value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)}
/>
      <input type="datetime-local" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} />
      <button type="submit" disabled={isLoading}>
        {isLoading ? '생성 중...' : '모임 만들기'}
      </button>
    </form>
  );
};

export default MeetingForm;