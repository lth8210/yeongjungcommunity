function StatusBadge({ status, isApplicant }) {
  let color = "#868e96";
  let label = status;

  if (status === "done") { color = "#40c057"; label = "완료"; }
  else if (status === "waiting") { color = "#fab005"; label = "대기"; }
  else if (status === "unread") { color = "#1971c2"; label = "읽지 않음"; }
  else if (status === "read") { color = "#ced4da"; label = "읽음"; }
  else if (status === "answered") { color = "#228be6"; label = "답변완료"; }
  else if (isApplicant && status === "active") { color = "#51cf66"; label = "참여중"; }
  // 주민제안용 상태 추가
  else if (status === "pending") { color = "#ffa94d"; label = "검토중"; }
  else if (status === "approved") { color = "#51cf66"; label = "채택"; }
  else if (status === "rejected") { color = "#fa5252"; label = "반려"; }

  return (
    <span style={{
      background: color, color: "#fff", borderRadius: 8, padding: "2px 8px", marginLeft: 8, fontSize: 13
    }}>
      {label}
    </span>
  );
}

export default StatusBadge;