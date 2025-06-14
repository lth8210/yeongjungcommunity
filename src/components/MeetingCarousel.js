// src/components/MeetingCarousel.js
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules'; // ✅ 모듈 추가
import 'swiper/css';
import 'swiper/css/navigation'; // ✅ CSS 추가

const MeetingCarousel = () => {
  const [meetings, setMeetings] = useState([]);

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const now = new Date().toISOString();
        const q = query(
          collection(db, 'meetings'),
          where('meetingTime', '>=', now),
          orderBy('meetingTime')
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMeetings(data);
      } catch (err) {
        console.error("모임 불러오기 오류:", err);
      }
    };
    fetchMeetings();
  }, []);

  if (meetings.length === 0) return null;

  return (
    <div className="meeting-carousel card">
      <h3>모집 중인 모임</h3>
      <Swiper
        modules={[Navigation]} // ✅
        navigation              // ✅
        spaceBetween={20}
        slidesPerView={'auto'}
      >
        {meetings.map(meeting => (
          <SwiperSlide key={meeting.id} style={{ width: '300px' }}>
            <Link to={`/meeting/${meeting.id}`} className="carousel-item-link">
              <div className="carousel-item">
                <h4>{meeting.title}</h4>
                <p>{new Date(meeting.meetingTime).toLocaleString('ko-KR')}</p>
                <p>{meeting.location}</p>
                <p>{meeting.description}</p>
              </div>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default MeetingCarousel;