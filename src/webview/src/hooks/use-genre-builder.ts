import { useCallback, useEffect, useState } from 'react';
import type { GenreMode, GenrePayload } from '../../../shared/messages';
import { onHostMessage, postToHost } from '../services/message-client';

/** Estado do Genre Builder derivado exclusivamente do host. */
export function useGenreBuilder() {
  const [payload, setPayload] = useState<GenrePayload | undefined>();
  const [mode, setModeState] = useState<GenreMode>('identity');
  const [error, setError] = useState('');

  useEffect(() => {
    return onHostMessage((message) => {
      switch (message.type) {
        case 'genre':
          setPayload(message.payload);
          break;
        case 'mode':
          setModeState(message.mode);
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

  const setMode = useCallback((next: GenreMode) => {
    setModeState(next);
    postToHost({ type: 'setMode', mode: next });
  }, []);

  const setDominant = useCallback((genreId: string) => {
    postToHost({ type: 'setDominantGenre', genreId });
  }, []);

  const addSecondary = useCallback((genreId: string) => {
    postToHost({ type: 'addSecondaryGenre', genreId });
  }, []);

  const removeSecondary = useCallback((genreId: string) => {
    postToHost({ type: 'removeSecondaryGenre', genreId });
  }, []);

  const setSubGenres = useCallback((genreId: string, names: readonly string[]) => {
    postToHost({ type: 'setSubGenres', genreId, names: [...names] });
  }, []);

  const setContractField = useCallback((field: keyof GenrePayload['profile']['contract'], value: string) => {
    postToHost({ type: 'setContract', contract: { [field]: value } });
  }, []);

  const setDimension = useCallback((field: keyof GenrePayload['profile']['dimensions'], value: string) => {
    postToHost({ type: 'setDimensions', dimensions: { [field]: value } });
  }, []);

  const regenerate = useCallback(() => {
    postToHost({ type: 'regenerateGenreContract' });
  }, []);

  return {
    payload,
    mode,
    error,
    setMode,
    setDominant,
    addSecondary,
    removeSecondary,
    setSubGenres,
    setContractField,
    setDimension,
    regenerate,
  };
}
