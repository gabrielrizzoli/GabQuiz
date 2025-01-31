import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

function CreateQuiz() {
  const [quiz, setQuiz] = useState({
    title: '',
    description: '',
    questions: [{ question: '', options: ['', '', '', ''], correctAnswer: 0 }]
  });
  const [roomCode, setRoomCode] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Criando quiz:', quiz);
      const quizResponse = await axios.post('http://localhost:5000/api/quizzes', quiz);
      console.log('Quiz criado:', quizResponse.data);
      
      const roomResponse = await axios.post('http://localhost:5000/api/rooms', {
        quizId: quizResponse.data._id
      });
      console.log('Sala criada:', roomResponse.data);

      setRoomCode(roomResponse.data.code);
    } catch (error) {
      console.error('Erro ao criar quiz:', error);
      alert('Erro ao criar o quiz. Por favor, tente novamente.');
    }
  };

  const handleStartGame = () => {
    if (roomCode) {
      navigate(`/room/${roomCode}`);
    }
  };

  const addQuestion = () => {
    setQuiz({
      ...quiz,
      questions: [...quiz.questions, { question: '', options: ['', '', '', ''], correctAnswer: 0 }]
    });
  };

  return (
    <div className="container">
      <div className="navbar">
        <button onClick={() => navigate(-1)} className="btn-back">
          ← Voltar
        </button>
        <h1>Criar Novo Quiz</h1>
      </div>
      
      {!roomCode ? (
        <div className="create-quiz">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="required">Título do Quiz</label>
              <input
                type="text"
                placeholder="Digite um título interessante para seu quiz"
                value={quiz.title}
                onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Descrição</label>
              <textarea
                placeholder="Descreva do que se trata seu quiz"
                value={quiz.description}
                onChange={(e) => setQuiz({ ...quiz, description: e.target.value })}
              />
            </div>

            <div className="questions-counter">
              Total de Perguntas: {quiz.questions.length}
            </div>

            {quiz.questions.map((q, qIndex) => (
              <div key={qIndex} className="question-container">
                <h3>Pergunta {qIndex + 1}</h3>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Digite sua pergunta"
                    value={q.question}
                    onChange={(e) => {
                      const newQuestions = [...quiz.questions];
                      newQuestions[qIndex].question = e.target.value;
                      setQuiz({ ...quiz, questions: newQuestions });
                    }}
                    required
                  />
                </div>

                {q.options.map((option, oIndex) => (
                  <div key={oIndex} className="option-container">
                    <input
                      type="text"
                      placeholder={`Opção ${oIndex + 1}`}
                      value={option}
                      onChange={(e) => {
                        const newQuestions = [...quiz.questions];
                        newQuestions[qIndex].options[oIndex] = e.target.value;
                        setQuiz({ ...quiz, questions: newQuestions });
                      }}
                      required
                    />
                    <label className="radio-container">
                      <input
                        type="radio"
                        name={`correct-${qIndex}`}
                        checked={q.correctAnswer === oIndex}
                        onChange={() => {
                          const newQuestions = [...quiz.questions];
                          newQuestions[qIndex].correctAnswer = oIndex;
                          setQuiz({ ...quiz, questions: newQuestions });
                        }}
                      />
                      Resposta correta
                    </label>
                  </div>
                ))}
              </div>
            ))}

            <div className="button-group">
              <button type="button" onClick={addQuestion} className="btn-secondary">
                + Adicionar Pergunta
              </button>
              <button type="submit" className="btn-primary">
                Criar Quiz
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="success-message">
          <h2>Quiz criado com sucesso!</h2>
          <div className="room-code">
            <p>Código da sala:</p>
            <h3>{roomCode}</h3>
            <p>Compartilhe este código com os participantes</p>
          </div>
          <div className="button-group">
            <Link to="/" className="btn-primary">
              Voltar ao Menu Inicial
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateQuiz; 