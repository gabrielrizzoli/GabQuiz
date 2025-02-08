import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

function Login() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Verificar se já está logado
  useEffect(() => {
    if (localStorage.getItem('userId')) {
      navigate('/');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post(process.env.BACKEND_BASEURL + '/api/auth/login', formData);
      localStorage.setItem('username', response.data.user.username);
      localStorage.setItem('userId', response.data.user.id);
      navigate('/');
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao fazer login');
    }
  };

  return (
    <div className="container">
      <div className="navbar">
        <h1>
          <span className="gab">GAB</span>
          <span className="quiz">Quiz</span>
        </h1>
      </div>
      <div className="auth-form">
        <h2>Login</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome de usuário</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
          </div>
          <button type="submit" className="btn-primary">Entrar</button>
        </form>
        <p className="auth-link">
          Não tem uma conta? <Link to="/register">Registre-se</Link>
        </p>
      </div>
    </div>
  );
}

export default Login; 