const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
  status: {
    type: String,
    enum: ['waiting', 'active', 'finished'],
    default: 'waiting'
  },
  participants: [{
    userId: String,
    username: String,
    score: { type: Number, default: 0 }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Room', RoomSchema); 