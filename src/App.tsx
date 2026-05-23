import { useState, useCallback, useEffect } from 'react';
import useVoiceChat from './hooks/useVoiceChat';

type Phase = 'landing' | 'room' | 'chat';

function generateRoomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('landing');
  const [currentRoomId, setCurrentRoomId] = useState<string>('');
  const [isHost, setIsHost] = useState(false);
  const [userName, setUserName] = useState('');
  const [copied, setCopied] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');

  const {
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
  } = useVoiceChat(currentRoomId || null, isHost);

  // Read room ID from URL hash on mount and auto-join
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      setJoinRoomId(hash);
      setPeerName('Аноним');
      setCurrentRoomId(hash);
      setIsHost(false);
      setPhase('chat');
      const guestId = 'voice-chat-guest-' + Math.random().toString(36).substring(2, 10);
      // Small delay to ensure state is set
      setTimeout(() => initPeer(guestId), 100);
    }
  }, []);

  const handleCreateRoom = useCallback(() => {
    const name = userName.trim() || 'Аноним';
    setPeerName(name);
    const newRoomId = generateRoomId();
    setCurrentRoomId(newRoomId);
    setIsHost(true);
    setPhase('room');

    // Update URL hash
    window.location.hash = newRoomId;

    const fullId = 'voice-chat-' + newRoomId;
    initPeer(fullId);
  }, [userName, initPeer, setPeerName]);

  const handleJoinRoom = useCallback(() => {
    const name = userName.trim() || 'Аноним';
    setPeerName(name);
    const rid = joinRoomId.trim();
    if (!rid) return;

    setCurrentRoomId(rid);
    setIsHost(false);
    setPhase('chat');

    // Update URL hash
    window.location.hash = rid;

    const guestId = 'voice-chat-guest-' + Math.random().toString(36).substring(2, 10);
    initPeer(guestId);
  }, [userName, joinRoomId, initPeer, setPeerName]);

  const handleEndCall = useCallback(() => {
    endCall();
    setTimeout(() => {
      setPhase('landing');
      setUserName('');
      setCurrentRoomId('');
    }, 1500);
  }, [endCall]);

  const handleCopyLink = useCallback(async () => {
    const link = `${window.location.origin}${window.location.pathname}#${currentRoomId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [currentRoomId]);

  const shareUrl = `${window.location.origin}${window.location.pathname}#${currentRoomId}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background animated blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* ========== LANDING ========== */}
      {phase === 'landing' && (
        <div className="relative z-10 w-full max-w-md space-y-8 animate-fadeIn">
          {/* Logo */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-2xl shadow-indigo-500/30">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-indigo-300 bg-clip-text text-transparent">
                Voice Chat
              </h1>
              <p className="text-slate-400 mt-2 text-lg">Голосовой звонок другу по ссылке</p>
            </div>
          </div>

          {/* Name input */}
          <div className="space-y-4">
            <div className="space-y-2">
          <label className="text-sm text-slate-400 font-medium">Ваше имя</label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Введите ваше имя..."
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateRoom(); }}
          />
            </div>

            {/* Create room button */}
            <button
              onClick={handleCreateRoom}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold text-lg shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              🎙 Создать комнату
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-sm text-slate-500">или</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Join room */}
            <div className="flex gap-2">
              <input
                type="text"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="ID комнаты..."
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                onKeyDown={(e) => { if (e.key === 'Enter') handleJoinRoom(); }}
              />
              <button
                onClick={handleJoinRoom}
                disabled={!joinRoomId.trim()}
                className="px-6 py-3 rounded-xl bg-white/10 border border-white/10 text-white font-medium hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Войти
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== ROOM WAITING (Host) ========== */}
      {phase === 'room' && (
        <div className="relative z-10 w-full max-w-md space-y-8 animate-fadeIn">
          {/* Waiting indicator */}
          <div className="text-center space-y-6">
            <div className="relative inline-flex items-center justify-center w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-indigo-500/30 animate-pulse" />
              <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 shadow-2xl shadow-indigo-500/30">
                <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold">
                {peerId ? 'Комната создана!' : 'Подключение...'}
              </h2>
              <p className="text-slate-400 mt-1">
                {peerId
                  ? 'Отправьте ссылку другу — он позвонит вам'
                  : 'Создаём комнату, подождите...'}
              </p>
            </div>
          </div>

          {peerId && (
            <div className="space-y-4">
              {/* Share link */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400 font-medium">Ссылка для друга</span>
                  <button
                    onClick={handleCopyLink}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      copied
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30'
                    }`}
                  >
                    {copied ? '✓ Скопировано!' : '📋 Копировать'}
                  </button>
                </div>
                <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
                  <span className="text-sm text-indigo-300 truncate flex-1 font-mono">{shareUrl}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Комната:</span>
                  <span className="text-xs font-bold text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded">{currentRoomId}</span>
                </div>
              </div>

              {/* Waiting for call */}
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-center">
                <div className="flex items-center justify-center gap-2 text-yellow-400">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">Ожидание входящего звонка...</span>
                </div>
              </div>

              {/* Cancel */}
              <button
                onClick={() => {
                  setPhase('landing');
                  setCurrentRoomId('');
                }}
                className="w-full py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm"
              >
                ← Назад
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========== CHAT ========== */}
      {phase === 'chat' && (
        <div className="relative z-10 w-full max-w-md space-y-8 animate-fadeIn">
          {/* Status */}
          <div className="text-center space-y-6">
            {chatState === 'connecting' && (
              <div className="space-y-4">
                <div className="relative inline-flex items-center justify-center w-28 h-28">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500/30 animate-ping" />
                  <div className="relative flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-indigo-600 to-violet-700 shadow-2xl shadow-indigo-500/30">
                    <svg className="w-14 h-14 text-white/80 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-indigo-300">Подключение...</h2>
                  <p className="text-slate-400 mt-1">Устанавливаем соединение</p>
                </div>
              </div>
            )}

            {chatState === 'waiting' && (
              <div className="space-y-4">
                <div className="relative inline-flex items-center justify-center w-28 h-28">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500/30 animate-ping" style={{ animationDuration: '2s' }} />
                  <div className="relative flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-indigo-600 to-violet-700 shadow-2xl shadow-indigo-500/30">
                    <svg className="w-14 h-14 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Ожидание звонка...</h2>
                  <p className="text-slate-400 mt-1">Ваш друг подключится по ссылке</p>
                </div>
                <button
                  onClick={handleCopyLink}
                  className={`mt-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                    copied
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
                  }`}
                >
                  {copied ? '✓ Ссылка скопирована!' : '📋 Копировать ссылку'}
                </button>
              </div>
            )}

            {chatState === 'calling' && (
              <div className="space-y-4">
                <div className="relative inline-flex items-center justify-center w-28 h-28">
                  <div className="absolute inset-0 rounded-full border-4 border-yellow-500/30 animate-ping" />
                  <div className="relative flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 shadow-2xl shadow-yellow-500/30">
                    <svg className="w-14 h-14 text-white/80 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-yellow-400">Звоним...</h2>
                  <p className="text-slate-400 mt-1">Подключение к собеседнику</p>
                </div>
                <div className="flex justify-center gap-1">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {chatState === 'connected' && (
              <div className="space-y-6">
                <div className="relative inline-flex items-center justify-center">
                  {/* Animated sound waves */}
                  <div className="absolute inset-0 -m-8">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute inset-0 rounded-full border-2 border-green-500/20 animate-ping"
                        style={{ animationDuration: `${2 + i * 0.5}s`, animationDelay: `${i * 0.3}s` }}
                      />
                    ))}
                  </div>
                  <div className="relative flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-2xl shadow-green-500/30">
                    <svg className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                    </svg>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-green-400">
                    {peerName ? `Разговор с ${peerName}` : 'В эфире'}
                  </h2>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-sm text-green-400/80">Соединение активно</span>
                    {isRemoteMuted && (
                      <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                        Собеседник на mute
                      </span>
                    )}
                  </div>
                </div>

                {/* Sound wave visualization */}
                <div className="flex items-center justify-center gap-1 h-12">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-green-500/60 rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 40 + 10}px`,
                        animationDelay: `${i * 80}ms`,
                        animationDuration: `${0.5 + Math.random() * 0.5}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {chatState === 'ended' && (
              <div className="space-y-4">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-slate-700/50 border border-white/10">
                  <svg className="w-12 h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-400">Звонок завершён</h2>
                  <p className="text-slate-500 mt-1">Возврат на главную...</p>
                </div>
              </div>
            )}

            {chatState === 'error' && (
              <div className="space-y-4">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-500/20 border border-red-500/30">
                  <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-red-400">Ошибка</h2>
                  <p className="text-slate-400 mt-1">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          {(chatState === 'connected' || chatState === 'waiting' || chatState === 'calling' || chatState === 'connecting') && (
            <div className="flex items-center justify-center gap-4">
              {/* Mute button */}
              <button
                onClick={toggleMute}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
                  isMuted
                    ? 'bg-red-500/20 border-2 border-red-500/50 text-red-400'
                    : 'bg-white/10 border-2 border-white/20 text-white'
                }`}
                title={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
              >
                {isMuted ? (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l6 6m0-6l-6 6" />
                  </svg>
                ) : (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>

              {/* Hang up button */}
              <button
                onClick={handleEndCall}
                className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-2xl shadow-red-500/30 hover:scale-110 active:scale-95 transition-all"
                title="Завершить звонок"
              >
                <svg className="w-9 h-9 rotate-[135deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
              </button>

              {/* Share link button */}
              <button
                onClick={handleCopyLink}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
                  copied
                    ? 'bg-green-500/20 border-2 border-green-500/50 text-green-400'
                    : 'bg-white/10 border-2 border-white/20 text-white'
                }`}
                title="Копировать ссылку"
              >
                {copied ? (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                  </svg>
                )}
              </button>
            </div>
          )}

          {/* Retry button on error */}
          {chatState === 'error' && (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setError(null);
                  if (!isHost) {
                    const guestId = 'voice-chat-guest-' + Math.random().toString(36).substring(2, 10);
                    initPeer(guestId);
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-white/10 border border-white/10 text-white font-medium hover:bg-white/15 transition-all"
              >
                Повторить
              </button>
              <button
                onClick={handleEndCall}
                className="flex-1 py-3 rounded-xl bg-white/10 border border-white/10 text-white font-medium hover:bg-white/15 transition-all"
              >
                Выйти
              </button>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="relative z-10 mt-16 text-center">
        <p className="text-xs text-slate-600">
          🔒 Зашифровано end-to-end • WebRTC P2P
        </p>
      </div>
    </div>
  );
}
