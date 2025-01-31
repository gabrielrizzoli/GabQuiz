import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Room from './components/Room';
import CreateQuiz from './components/CreateQuiz';
import JoinRoom from './components/JoinRoom';
import Register from './components/Register';
import Login from './components/Login';

// Componente para rotas protegidas
const PrivateRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('userId');
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function Home() {
  return (
    <div className="container">
      <div className="navbar">
        <h1>
          <span className="gab">GAB</span>
          <span className="quiz">Quiz</span>
        </h1>
      </div>
      <div className="home-content">
        <h2>Bem-vindo ao GAB Quiz!</h2>
        <div className="button-group">
          <Link to="/create" className="btn-primary">Criar Quiz</Link>
          <Link to="/join" className="btn-secondary">Entrar em uma Sala</Link>
          <button 
            onClick={() => {
              localStorage.removeItem('userId');
              localStorage.removeItem('username');
              window.location.href = '/login';
            }} 
            className="btn-secondary"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Rotas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Rotas protegidas */}
          <Route path="/room/:roomCode" element={
            <PrivateRoute>
              <Room />
            </PrivateRoute>
          } />
          <Route path="/create" element={
            <PrivateRoute>
              <CreateQuiz />
            </PrivateRoute>
          } />
          <Route path="/join" element={
            <PrivateRoute>
              <JoinRoom />
            </PrivateRoute>
          } />
          <Route path="/" element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 