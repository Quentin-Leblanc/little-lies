import { isHost, useMultiplayerState, usePlayersList, me } from 'playroomkit';

class Message {
  constructor(props) {
    this.hey = 'hey';
  }
}

const MessageTest = () => {
  const [messages, setMessages] = useMultiplayerState('chatMessages');
  Message.prototype.post = function () {
    setMessages([
      ...messages,
      {
        player: 'toto',
        color: 'grey',
        content: 'yolo hey c’est toto',
        team: 'mafia',
        chat: 'default',
        type: 'player',
        dayCount: 1,
      },
    ]);
  };

  return Message;
};

export default MessageTest;
