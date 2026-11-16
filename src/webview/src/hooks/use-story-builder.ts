import { useCallback, useEffect, useState } from 'react';
import type { StoryAction, StoryDocumentKindMessage, StoryPayload } from '../../../shared/messages';
import { onHostMessage, postToHost } from '../services/message-client';

/** Estado do Story Builder derivado exclusivamente do host. */
export function useStoryBuilder() {
  const [payload, setPayload] = useState<StoryPayload | undefined>();
  const [error, setError] = useState('');

  useEffect(() => {
    return onHostMessage((message) => {
      switch (message.type) {
        case 'story':
          setPayload(message.payload);
          break;
        case 'error':
          setError(message.message);
          break;
      }
    });
  }, []);

  useEffect(() => {
    postToHost({ type: 'ready' });
  }, []);

  const act = useCallback((action: StoryAction) => {
    postToHost({ type: 'storyAction', action });
  }, []);

  const regenerate = useCallback((kind: StoryDocumentKindMessage) => {
    postToHost({ type: 'regenerateStoryDocument', kind });
  }, []);

  return { payload, error, act, regenerate };
}
