'use client';

import { useGame } from './GameProvider';

export function FeedbackToast() {
  const { state } = useGame();

  return (
    <div role="status" aria-live="polite" className="feedback-toast">
      <span className="feedback-dot" />
      {state.feedback}
    </div>
  );
}
