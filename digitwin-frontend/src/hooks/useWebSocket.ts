// WebSocket connection hook for real-time data
import { useEffect, useRef } from 'react';
import { useEnvironmentStore } from '../stores/environmentStore';

interface UseWebSocketOptions {
  url: string;
  reconnectInterval?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocket({
  url,
  reconnectInterval = 5000,
  onOpen,
  onClose,
  onError,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { updateData, setConnected } = useEnvironmentStore();

  useEffect(() => {
    const connect = () => {
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected');
          setConnected(true);
          onOpen?.();
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            if (message.type === 'environment_update' || message.type === 'initial_data') {
              updateData(message.data);
            }
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          onError?.(error);
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setConnected(false);
          onClose?.();

          // Attempt to reconnect
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect...');
            connect();
          }, reconnectInterval);
        };
      } catch (err) {
        console.error('Failed to create WebSocket:', err);
      }
    };

    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url, reconnectInterval, onOpen, onClose, onError, updateData, setConnected]);

  return {
    send: (data: any) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(data));
      }
    },
  };
}
