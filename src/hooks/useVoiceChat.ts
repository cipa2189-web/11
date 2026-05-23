import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';

type ChatState = 'idle' | 'connecting' | 'waiting' | 'calling' | 'connected' | 'ended' | 'error';

function useVoiceChat(roomId: string | null, isHost: boolean) {
  const [peerId, setPeerId] = useState<string | null>(null);
  const [peerName, setPeerName] = useState<string>('');
  const [chatState, setChatState] = useState<ChatState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peerRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const dataConnRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rtcCallRef = useRef<any>(null);
  const chatStateRef = useRef<ChatState>('idle');

  // Keep ref in sync
  useEffect(() => {
    chatStateRef.current = chatState;
  }, [chatState]);

  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (rtcCallRef.current) {
      try { rtcCallRef.current.close(); } catch (e) { console.warn(e); }
      rtcCallRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
    if (dataConnRef.current) {
      try { dataConnRef.current.close(); } catch (e) { console.warn(e); }
      dataConnRef.current = null;
    }
    if (peerRef.current) {
      try { peerRef.current.destroy(); } catch (e) { console.warn(e); }
      peerRef.current = null;
    }
  }, []);

  const makeCall = useCallback(async () => {
    if (!roomId || !peerRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      const hostId = 'voice-chat-' + roomId;
      const call = peerRef.current.call(hostId, stream);
      rtcCallRef.current = call;

      const remoteAudio = new Audio();
      audioRef.current = remoteAudio;

      call.on('stream', (remoteStream: MediaStream) => {
        remoteAudio.srcObject = remoteStream;
        remoteAudio.play().catch(() => {});
        setChatState('connected');
      });

      call.on('close', () => {
        if (chatStateRef.current !== 'ended') {
          setChatState('ended');
        }
      });

      call.on('error', (err: any) => {
        console.error('Call error:', err);
        setChatState('error');
        setError('Не удалось соединиться с собеседником');
      });

      // Data connection for metadata
      const conn = peerRef.current.connect(hostId);
      dataConnRef.current = conn;

      conn.on('open', () => {
        conn.send(`name:${peerName}`);
      });

      conn.on('data', (data: string) => {
        if (typeof data === 'string' && data.startsWith('name:')) {
          setPeerName(data.substring(5));
        }
        if (data === 'mute') setIsRemoteMuted(true);
        if (data === 'unmute') setIsRemoteMuted(false);
      });
    } catch (err) {
      console.error('Start call error:', err);
      setError('Не удалось начать звонок');
      setChatState('error');
    }
  }, [roomId, peerName]);

  const initPeer = useCallback(
    async (pid: string) => {
      try {
        setError(null);
        setChatState('connecting');
        cleanup();

        // Use public cloud server for now (works everywhere)
        // Local server fails on mobile browsers without proper HTTPS certificate
        const peerConfig: any = { debug: 0 };

        // Only use local server if explicitly configured via env or in production with proper HTTPS
        const useLocalServer = false; // Disabled for mobile compatibility

        if (useLocalServer) {
          peerConfig.host = window.location.hostname;
          peerConfig.port = window.location.port ? parseInt(window.location.port) : (window.location.protocol === 'https:' ? 443 : 80);
          peerConfig.path = '/peerjs/myapp';
          peerConfig.secure = window.location.protocol === 'https:';
        }

        const peer = new Peer(pid, peerConfig);
        peerRef.current = peer;

        peer.on('open', (_pid: string) => {
          setPeerId(_pid);
          if (isHost) {
            setChatState('waiting');
          } else {
            // Guest: automatically call the host after a short delay
            setChatState('calling');
            setTimeout(() => {
              makeCall();
            }, 500);
          }
        });

        peer.on('error', (err: any) => {
          console.error('Peer error:', err);
          if (err.type === 'unavailable-id') {
            setError('Этот ID уже занят. Попробуйте создать новую комнату.');
            setChatState('error');
          } else if (err.type === 'peer-unavailable') {
            setError('Собеседник не найден. Возможно, он вышел из комнаты.');
            setChatState('error');
          } else if (err.type === 'network') {
            setError('Ошибка сети. Проверьте подключение.');
            setChatState('error');
          } else {
            setError('Ошибка: ' + err.type);
            setChatState('error');
          }
        });

        // Handle incoming voice calls (for host)
        peer.on('call', (call: any) => {
          navigator.mediaDevices
            .getUserMedia({ audio: true, video: false })
            .then((stream: MediaStream) => {
              localStreamRef.current = stream;
              call.answer(stream);
              rtcCallRef.current = call;

              const remoteAudio = new Audio();
              audioRef.current = remoteAudio;

              call.on('stream', (remoteStream: MediaStream) => {
                remoteAudio.srcObject = remoteStream;
                remoteAudio.play().catch(() => {});
                setChatState('connected');
              });

              call.on('close', () => {
                setChatState('ended');
              });
            })
            .catch((err: any) => {
              console.error('Mic error:', err);
              setError('Не удалось получить доступ к микрофону. Разрешите доступ в браузере.');
              setChatState('error');
            });
        });

        // Handle incoming data connections (for host)
        peer.on('connection', (conn: any) => {
          dataConnRef.current = conn;

          conn.on('data', (data: string) => {
            if (data === 'mute') setIsRemoteMuted(true);
            if (data === 'unmute') setIsRemoteMuted(false);
            if (typeof data === 'string' && data.startsWith('name:')) {
              setPeerName(data.substring(5));
            }
          });
        });
      } catch (err) {
        console.error('Init error:', err);
        setError('Ошибка инициализации');
        setChatState('error');
      }
    },
    [isHost, cleanup, makeCall]
  );

  const endCall = useCallback(() => {
    if (rtcCallRef.current) {
      try { rtcCallRef.current.close(); } catch {}
    }
    if (dataConnRef.current) {
      try { dataConnRef.current.close(); } catch {}
    }
    setChatState('ended');
    cleanup();
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !newMuted;
      });
    }

    if (dataConnRef.current && dataConnRef.current.open) {
      dataConnRef.current.send(newMuted ? 'mute' : 'unmute');
    }
  }, [isMuted]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    peerId,
    chatState,
    isMuted,
    isRemoteMuted,
    error,
    peerName,
    setPeerName,
    initPeer,
    endCall,
    toggleMute,
    setError,
  };
}

export default useVoiceChat;
