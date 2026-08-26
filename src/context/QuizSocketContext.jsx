import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { setServerClockOffset, getServerNow } from '../utils/timeSync';

const QuizSocketContext = createContext(null);

export function QuizSocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [eventStatus, setEventStatus] = useState('REGISTRATION_OPEN');
  const [activeQuizId, setActiveQuizId] = useState('default_quiz');
  const [quizTitle, setQuizTitle] = useState('Live Quiz Competition by SSF Kurukathani Unit');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [questionEndTime, setQuestionEndTime] = useState(null);
  const [timeRemainingSec, setTimeRemainingSec] = useState(0);
  const [activePlayersCount, setActivePlayersCount] = useState(0);
  const [lastQuestionResult, setLastQuestionResult] = useState(null);
  const [userSubmission, setUserSubmission] = useState(null);
  const [adminStats, setAdminStats] = useState(null);

  const socketRef = useRef(null);
  const pollTimerRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connectWebSocket = () => {
    if (socketRef.current) {
      socketRef.current.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsReconnecting(false);
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);

        const participantToken = localStorage.getItem('ssf_participant_token');
        const adminToken = localStorage.getItem('ssf_admin_token');

        if (adminToken) {
          ws.send(JSON.stringify({ type: 'AUTH_INIT', payload: { role: 'admin', token: adminToken } }));
        } else {
          ws.send(JSON.stringify({ type: 'AUTH_INIT', payload: { role: 'participant', token: participantToken } }));
        }

        ws.send(JSON.stringify({ type: 'PING', payload: { clientTimestamp: Date.now() } }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleSocketMessage(msg);
        } catch (e) {
          console.error('Failed to parse socket message', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsReconnecting(true);
        startShortPollingFallback();
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      setIsConnected(false);
      startShortPollingFallback();
    }
  };

  const startShortPollingFallback = () => {
    if (pollTimerRef.current) return;
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/quiz/sync-state');
        if (res.ok) {
          const data = await res.json();
          setServerClockOffset(data.serverTime);
          setEventStatus(data.eventStatus);
          setCurrentQuestion(data.currentQuestion);
          setQuestionStartTime(data.questionStartTime);
          setQuestionEndTime(data.questionEndTime);
          setTimeRemainingSec(data.timeRemainingSec);
        }
      } catch (e) {}
    }, 3000);
  };

  const handleSocketMessage = (msg) => {
    switch (msg.type) {
      case 'INIT_SYNC': {
        const { serverTime, activeQuizId: aId, quizTitle: qT, eventStatus: eS, currentQuestion: cQ, questionStartTime: qST, questionEndTime: qET, timeRemainingSec: tRS, activePlayersCount: aPC, userSubmission: uSub } = msg.payload;
        setServerClockOffset(serverTime);
        if (aId) setActiveQuizId(aId);
        if (qT) setQuizTitle(qT);
        setEventStatus(eS);
        setCurrentQuestion(cQ);
        setQuestionStartTime(qST);
        setQuestionEndTime(qET);
        setTimeRemainingSec(tRS);
        setActivePlayersCount(aPC);
        if (uSub) setUserSubmission(uSub);
        break;
      }

      case 'QUIZ_EVENT_ACTIVATED': {
        if (msg.payload.activeQuizId) setActiveQuizId(msg.payload.activeQuizId);
        if (msg.payload.quizTitle) setQuizTitle(msg.payload.quizTitle);
        setEventStatus(msg.payload.eventStatus || 'REGISTRATION_OPEN');
        setCurrentQuestion(null);
        setLastQuestionResult(null);
        setUserSubmission(null);
        setServerClockOffset(msg.payload.serverTime);
        break;
      }

      case 'PONG': {
        if (msg.payload?.clientTimestamp && msg.payload?.serverTime) {
          setServerClockOffset(msg.payload.serverTime, msg.payload.clientTimestamp);
        }
        break;
      }

      case 'EVENT_STATUS_CHANGED': {
        setEventStatus(msg.payload.eventStatus);
        setServerClockOffset(msg.payload.serverTime);
        break;
      }

      case 'NEW_QUESTION_AVAILABLE': {
        setServerClockOffset(msg.payload.serverTime);
        setCurrentQuestion(msg.payload.currentQuestion);
        setQuestionStartTime(msg.payload.questionStartTime);
        setQuestionEndTime(msg.payload.questionEndTime);
        setTimeRemainingSec(msg.payload.durationSec);
        setEventStatus('QUESTION_ACTIVE');
        setLastQuestionResult(null);
        setUserSubmission(null);
        break;
      }

      case 'TIMER_TICK': {
        setTimeRemainingSec(msg.payload.remainingSec);
        setServerClockOffset(msg.payload.serverTime);
        break;
      }

      case 'QUESTION_TIME_EXTENDED': {
        setQuestionEndTime(msg.payload.newEndTime);
        setTimeRemainingSec(msg.payload.timeRemainingSec);
        setServerClockOffset(msg.payload.serverTime);
        break;
      }

      case 'QUESTION_CLOSED': {
        setEventStatus('QUESTION_RESULTS');
        setServerClockOffset(msg.payload.serverTime);
        setLastQuestionResult(msg.payload);
        break;
      }

      case 'SUBMIT_RESPONSE': {
        if (msg.payload?.success) {
          setUserSubmission(msg.payload.result);
        }
        break;
      }

      case 'ADMIN_STATS_UPDATE': {
        setAdminStats(msg.payload);
        break;
      }

      case 'ADMIN_PARTICIPANT_REGISTERED': {
        setAdminStats(prev => prev ? ({
          ...prev,
          registeredUsers: (prev.registeredUsers || 0) + 1
        }) : prev);
        break;
      }

      case 'ADMIN_LIVE_ANSWER_EVENT': {
        setAdminStats(prev => prev ? ({ ...prev, ...msg.payload }) : msg.payload);
        break;
      }

      default:
        break;
    }
  };

  const reauthenticate = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const participantToken = localStorage.getItem('ssf_participant_token');
      const adminToken = localStorage.getItem('ssf_admin_token');

      if (adminToken) {
        socketRef.current.send(JSON.stringify({ type: 'AUTH_INIT', payload: { role: 'admin', token: adminToken } }));
      } else {
        socketRef.current.send(JSON.stringify({ type: 'AUTH_INIT', payload: { role: 'participant', token: participantToken } }));
      }
    } else {
      connectWebSocket();
    }
  };

  const submitAnswer = (questionId, selectedAnswer) => {
    const token = localStorage.getItem('ssf_participant_token');
    if (!token) return { success: false, error: 'NO_TOKEN' };

    const clientTimestamp = Date.now();

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'SUBMIT_ANSWER',
        payload: { token, questionId, selectedAnswer, clientTimestamp }
      }));
      return { success: true, pending: true };
    } else {
      fetch('/api/quiz/submit-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, questionId, selectedAnswer, clientTimestamp })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setUserSubmission(data.result);
          }
        });
      return { success: true, pending: true };
    }
  };

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (socketRef.current) socketRef.current.close();
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (eventStatus !== 'QUESTION_ACTIVE' || !questionEndTime) return;

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((questionEndTime - getServerNow()) / 1000));
      setTimeRemainingSec(remaining);
    }, 200);

    return () => clearInterval(timer);
  }, [eventStatus, questionEndTime]);

  return (
    <QuizSocketContext.Provider value={{
      isConnected,
      isReconnecting,
      eventStatus,
      activeQuizId,
      quizTitle,
      currentQuestion,
      questionStartTime,
      questionEndTime,
      timeRemainingSec,
      activePlayersCount,
      lastQuestionResult,
      userSubmission,
      adminStats,
      submitAnswer,
      reconnect: connectWebSocket,
      reauthenticate
    }}>
      {children}
    </QuizSocketContext.Provider>
  );
}

export function useQuizSocket() {
  return useContext(QuizSocketContext);
}
