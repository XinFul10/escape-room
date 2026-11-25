import { GameProvider } from '../components/GameProvider';
import { Room } from '../components/Room';

export default function HomePage() {
  return (
    <GameProvider>
      <Room />
    </GameProvider>
  );
}
