import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function JoinRoom() {
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      console.log('Tentando entrar na sala:', roomCode);
      const response = await axios.get(`http://localhost:5000/api/rooms/${roomCode}`);

      if (response.data) {
        console.log('Sala encontrada:', response.data);
        navigate(`/room/${roomCode}`);
      }
    } catch (error) {
      console.error('Erro ao entrar na sala:', error);
      if (error.response) {
        if (error.response.status === 404) {
          setError('Sala não encontrada. Verifique o código e tente novamente.');
        } else {
          setError(`Erro: ${error.response.data.error || 'Erro desconhecido'}`);
        }
      } else {
        setError('Erro de conexão com o servidor. Tente novamente.');
      }
    }
  };

  return (
    <div className="container">
      <div className="navbar">
        <h1>Entrar em uma Sala</h1>
      </div>
      <div className="join-room-content">
        <form onSubmit={handleJoinRoom}>
          <div className="form-group">
            <label>Código da Sala</label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="Digite o código da sala"
              required
            />
          </div>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          <button type="submit" className="btn-primary">
            Entrar na Sala
          </button>
        </form>
      </div>
    </div>
  );
}

export default JoinRoom; 