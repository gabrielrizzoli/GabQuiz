import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

const QUESTION_TIME_LIMIT = 30; // Tempo em segundos para cada pergunta

function Room() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [participants, setParticipants] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [gameStatus, setGameStatus] = useState('waiting');
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answerFeedback, setAnswerFeedback] = useState(null); // 'correct', 'incorrect' ou null
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`http://localhost:5000/api/rooms/${roomCode}`);
        console.log('Dados da sala recebidos:', response.data);
        
        if (response.data && response.data.quiz) {
          setQuiz(response.data.quiz);
          setGameStatus(response.data.status);
          setParticipants(response.data.participants || []);
        } else {
          console.error('Quiz não encontrado nos dados da sala');
          setError('Dados do quiz não encontrados');
        }
      } catch (error) {
        console.error('Erro ao buscar sala:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoom();

    socket.emit('joinRoom', { 
      roomCode, 
      username: localStorage.getItem('username') 
    });

    socket.on('userJoined', (data) => {
      console.log('Usuário entrou, dados recebidos:', data);
      if (data.quiz) {
        setQuiz(data.quiz);
      }
      if (data.participants) {
        setParticipants(data.participants);
      } else {
        setParticipants(prev => [...prev, { username: data.username, score: 0 }]);
      }
    });

    socket.on('gameStarted', (data) => {
      console.log('Jogo iniciado, dados recebidos:', data);
      if (data.quiz) {
        setQuiz(data.quiz);
        setGameStatus('active');
        setCurrentQuestion(0);
        setTimeLeft(QUESTION_TIME_LIMIT);
      } else {
        console.error('Quiz não recebido no evento gameStarted');
        setError('Erro ao iniciar o jogo: dados do quiz não recebidos');
      }
    });

    socket.on('answerResult', ({ userId, correct }) => {
      if (userId === socket.id) {
        setAnswerFeedback(correct ? 'correct' : 'incorrect');
        // Limpa o feedback após 1 segundo
        setTimeout(() => {
          setAnswerFeedback(null);
        }, 1000);
      }
      
      setParticipants(prev => 
        prev.map(p => p.userId === userId 
          ? { ...p, score: p.score + (correct ? 10 : 0) }
          : p
        )
      );
    });

    socket.on('error', (error) => {
      console.error('Erro recebido:', error);
      setError(error.message);
    });

    return () => {
      socket.off('userJoined');
      socket.off('gameStarted');
      socket.off('answerResult');
    };
  }, [roomCode, navigate]);

  useEffect(() => {
    let timer;
    if (gameStatus === 'active' && quiz) {
      timer = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            // Tempo acabou, considerar como resposta errada
            if (selectedAnswer === null) {
              handleTimeOut();
            }
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [gameStatus, currentQuestion, quiz, selectedAnswer]);

  // Função para lidar com o timeout da pergunta
  const handleTimeOut = () => {
    console.log('Tempo esgotado!');
    // Emitir resposta incorreta
    socket.emit('submitAnswer', {
      roomCode,
      questionIndex: currentQuestion,
      answer: -1 // Indica que não houve resposta
    });

    // Aguardar um momento antes de passar para a próxima pergunta
    setTimeout(() => {
      if (currentQuestion + 1 < quiz.questions.length) {
        setCurrentQuestion(prev => prev + 1);
        setTimeLeft(QUESTION_TIME_LIMIT);
        setSelectedAnswer(null);
      } else {
        setGameStatus('finished');
      }
    }, 1000);
  };

  const handleStartGame = async () => {
    try {
      await axios.post(`http://localhost:5000/api/rooms/${roomCode}/start`);
    } catch (error) {
      console.error('Erro ao iniciar o jogo:', error);
    }
  };

  const handleAnswer = (answerIndex) => {
    if (selectedAnswer === null && timeLeft > 0) {
      setSelectedAnswer(answerIndex);
      socket.emit('submitAnswer', {
        roomCode,
        questionIndex: currentQuestion,
        answer: answerIndex
      });

      // Aguardar o feedback antes de passar para a próxima pergunta
      setTimeout(() => {
        if (currentQuestion + 1 < quiz.questions.length) {
          setCurrentQuestion(prev => prev + 1);
          setTimeLeft(QUESTION_TIME_LIMIT);
          setSelectedAnswer(null);
          setAnswerFeedback(null);
        } else {
          setGameStatus('finished');
        }
      }, 1500); // Aumentado para 1.5s para dar tempo de ver o feedback
    }
  };

  const handleGoBack = () => {
    const confirmExit = window.confirm('Tem certeza que deseja sair da sala?');
    if (confirmExit) {
      navigate(-1); // Volta para a página anterior
    }
  };

  // Adicione verificação de carregamento e erro
  if (isLoading) {
    return (
      <div className="container">
        <div className="loading-message">
          <h2>Carregando...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error-message">
          <h2>Erro ao carregar a sala</h2>
          <p>{error}</p>
          <Link to="/" className="btn-primary">Voltar ao Início</Link>
        </div>
      </div>
    );
  }

  // Adicione verificação de quiz antes de acessar suas propriedades
  const currentQuestionData = quiz && quiz.questions && quiz.questions[currentQuestion];

  return (
    <div className="container">
      <button onClick={handleGoBack} className="btn-back">
        ← Voltar
      </button>
      <div className="navbar">
        <h1>Quiz Room: {roomCode}</h1>
      </div>

      {gameStatus === 'waiting' && (
        <div className="waiting-room">
          <h2>Sala de Espera</h2>
          <div className="participants-list">
            {participants.map((p, index) => (
              <div key={index} className="participant-card">
                <h3>{p.username}</h3>
                <p>Pronto para começar!</p>
              </div>
            ))}
          </div>
          <button className="btn-primary" onClick={handleStartGame}>
            Iniciar Quiz
          </button>
        </div>
      )}

      {gameStatus === 'active' && quiz && currentQuestionData && (
        <div className="quiz-container">
          <div className={`timer ${timeLeft <= 10 ? 'timer-warning' : ''}`}>
            Tempo restante: {timeLeft}s
          </div>
          
          {answerFeedback && (
            <div className={`answer-feedback ${answerFeedback}`}>
              {answerFeedback === 'correct' ? '✅ Resposta Correta!' : '❌ Resposta Incorreta!'}
            </div>
          )}

          <div className="question">
            <h2>Questão {currentQuestion + 1} de {quiz.questions.length}</h2>
            <p>{currentQuestionData.question}</p>
          </div>
          
          <div className="options">
            {currentQuestionData.options.map((option, index) => (
              <button
                key={index}
                className={`option-button ${
                  selectedAnswer === index 
                    ? `selected ${answerFeedback ? answerFeedback : ''}`
                    : ''
                }`}
                onClick={() => handleAnswer(index)}
                disabled={selectedAnswer !== null || timeLeft === 0}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {gameStatus === 'finished' && (
        <div className="ranking">
          <h2>🏆 Ranking Final 🏆</h2>
          <div className="ranking-list">
            {participants
              .sort((a, b) => b.score - a.score)
              .map((p, index) => (
                <div key={index} className="ranking-item">
                  <div className="position">{index + 1}º</div>
                  <div className="username">{p.username}</div>
                  <div className="score">{p.score} pts</div>
                </div>
              ))}
          </div>
          <div className="button-group">
            <Link to="/" className="btn-primary">
              Voltar ao Início
            </Link>
            <button 
              onClick={() => window.location.reload()} 
              className="btn-secondary"
            >
              Jogar Novamente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Room; 