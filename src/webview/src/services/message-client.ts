import {
  hostToWebviewMessageSchema,
  webviewToHostMessageSchema,
  type HostToWebviewMessage,
  type WebviewToHostMessage,
} from '../../../shared/messages';

// acquireVsCodeApi só pode ser chamado uma vez por sessão.
const api = acquireVsCodeApi();

export function postToHost(message: WebviewToHostMessage): void {
  api.postMessage(webviewToHostMessageSchema.parse(message));
}

export function onHostMessage(handler: (message: HostToWebviewMessage) => void): () => void {
  const listener = (event: MessageEvent<unknown>) => {
    const parsed = hostToWebviewMessageSchema.safeParse(event.data);
    if (parsed.success) {
      handler(parsed.data);
    }
  };
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}
