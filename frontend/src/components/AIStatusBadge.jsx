const STATUS = {
  idle: 'Ready',
  listening: 'Listening',
  translating: 'Translating',
  speaking: 'Generating speech',
};

export default function AIStatusBadge({ status = 'idle' }) {
  return (
    <div className={`ai-status-badge ${status}`}>
      <span />
      {STATUS[status] ?? STATUS.idle}
    </div>
  );
}
