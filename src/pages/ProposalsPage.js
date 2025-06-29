import { useState } from 'react';
import ProposalForm from '../components/ProposalForm';
import ProposalList from '../components/ProposalList';

const ProposalsPage = ({ userInfo }) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleProposalAdded = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <div className="proposals-page">
      <h2>주민 제안</h2>
      <p>우리 동네를 더 좋게 만들기 위한 아이디어를 자유롭게 제안해주세요! 
        제안 이후 10명 이상 주민의 참여 댓글과 동의 여부에 따라 진행 여부를 검토합니다.</p>

      <div className="form-section">
        <ProposalForm onProposalAdded={handleProposalAdded} userInfo={userInfo} /> {/* <h3> 제거 */}
      </div>
      
      <div className="list-section">
        <h3>접수된 제안 목록</h3>
        <ProposalList key={refreshKey} userInfo={userInfo} />
      </div>
    </div>
  );
};

export default ProposalsPage;