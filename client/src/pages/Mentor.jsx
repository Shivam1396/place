import api from '../api/client';
import { Card } from '../components/Card';
import ChatBox from '../components/ChatBox';

export default function Mentor() {
  return (
    <Card title="AI placement mentor">
      <ChatBox initial={[{ role: 'assistant', content: 'Hi! Ask me anything — study plans, company prep, resume tips, how to crack interviews.' }]}
        onSend={async (message, history) => (await api.post('/chat', { message, history })).data.reply} />
    </Card>
  );
}
