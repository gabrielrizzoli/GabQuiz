const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const Room = require('./models/Room');
const Quiz = require('./models/Quiz');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

// Adicionar tratamento de erro para o processo
process.on('uncaughtException', (error) => {
  console.error('Erro não tratado:', error);
});

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Melhorar o log de conexão do MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
}).then(() => {
  console.log('MongoDB conectado com sucesso');
}).catch(err => {
  console.error('Erro ao conectar ao MongoDB:', err);
  process.exit(1);
});

// Adicionar tratamento de erro para o mongoose
mongoose.connection.on('error', err => {
  console.error('Erro na conexão MongoDB:', err);
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Quiz App API está rodando!',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login'
      },
      quiz: {
        create: 'POST /api/quizzes',
        rooms: {
          create: 'POST /api/rooms',
          join: 'GET /api/rooms/:code',
          start: 'POST /api/rooms/:code/start'
        }
      }
    }
  });
});

app.post('/api/quizzes', async (req, res) => {
  try {
    const quiz = new Quiz(req.body);
    await quiz.save();
    res.status(201).json(quiz);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/rooms', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.body.quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz não encontrado' });
    }

    const room = new Room({
      code: Math.random().toString(36).substring(7),
      quiz: quiz._id,
      status: 'waiting',
      participants: []
    });

    await room.save();
    
    // Retornar a sala já populada com o quiz
    const populatedRoom = await Room.findById(room._id).populate('quiz');
    res.status(201).json(populatedRoom);
  } catch (error) {
    console.error('Erro ao criar sala:', error);
    res.status(400).json({ error: error.message });
  }
});

// Rota para buscar uma sala específica
app.get('/api/rooms/:code', async (req, res) => {
  try {
    console.log('Buscando sala com código:', req.params.code);
    const room = await Room.findOne({ code: req.params.code }).populate('quiz');
    
    if (!room) {
      console.log('Sala não encontrada');
      return res.status(404).json({ error: 'Sala não encontrada' });
    }
    
    console.log('Sala encontrada:', room);
    res.json(room);
  } catch (error) {
    console.error('Erro ao buscar sala:', error);
    res.status(400).json({ error: error.message });
  }
});

// Rota para iniciar o quiz
app.post('/api/rooms/:code/start', async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code }).populate('quiz');
    if (!room) {
      return res.status(404).json({ error: 'Sala não encontrada' });
    }

    room.status = 'active';
    await room.save();
    
    io.to(req.params.code).emit('gameStarted', { quiz: room.quiz });
    res.json({ status: 'success' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Gerenciamento de conexões Socket.IO
io.on('connection', (socket) => {
  socket.on('joinRoom', async ({ roomCode, username }) => {
    try {
      const room = await Room.findOne({ code: roomCode }).populate('quiz');
      if (!room) {
        socket.emit('error', { message: 'Sala não encontrada' });
        return;
      }

      socket.join(roomCode);
      
      // Adicionar participante à sala
      const participant = { userId: socket.id, username, score: 0 };
      room.participants.push(participant);
      await room.save();

      // Emitir evento com dados atualizados
      io.to(roomCode).emit('userJoined', { 
        username,
        participants: room.participants,
        quiz: room.quiz 
      });
    } catch (error) {
      console.error('Erro ao entrar na sala:', error);
      socket.emit('error', { message: 'Erro ao entrar na sala' });
    }
  });

  socket.on('submitAnswer', async ({ roomCode, questionIndex, answer }) => {
    try {
      const room = await Room.findOne({ code: roomCode }).populate('quiz');
      if (!room || !room.quiz) {
        return;
      }

      const isCorrect = room.quiz.questions[questionIndex].correctAnswer === answer;
      
      if (isCorrect) {
        await Room.findOneAndUpdate(
          { code: roomCode, 'participants.userId': socket.id },
          { $inc: { 'participants.$.score': 10 } }
        );
      }

      io.to(roomCode).emit('answerResult', {
        userId: socket.id,
        correct: isCorrect
      });
    } catch (error) {
      console.error('Erro ao processar resposta:', error);
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Rota para registro de usuário
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Verificar se o usuário já existe
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Nome de usuário já existe' });
    }

    // Criar hash da senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Criar novo usuário
    const user = new User({
      username,
      password: hashedPassword
    });

    await user.save();
    res.status(201).json({ message: 'Usuário criado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota para login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Verificar se o usuário existe
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'Usuário não encontrado' });
    }

    // Verificar senha
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Senha incorreta' });
    }

    res.json({ 
      message: 'Login realizado com sucesso',
      user: {
        id: user._id,
        username: user.username
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (error) => {
  console.error('Erro ao iniciar o servidor:', error);
}); 