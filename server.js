const express = require('express');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'osl@2025';
const DATABASE_PATH = process.env.DATABASE_PATH || 'voting.db';

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ==================== SCALABILITY OPTIMIZATIONS ====================

// Rate limiting - simple in-memory store
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100; // max requests per window

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, { count: 1, startTime: now });
    return next();
  }
  
  const record = rateLimitStore.get(ip);
  
  if (now - record.startTime > RATE_LIMIT_WINDOW) {
    // Reset window
    rateLimitStore.set(ip, { count: 1, startTime: now });
    return next();
  }
  
  record.count++;
  
  if (record.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  
  next();
}

// Apply rate limiting to vote endpoints
app.use('/api/quiz/:id/vote', rateLimit);

// Clean up rate limit store periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now - record.startTime > RATE_LIMIT_WINDOW * 2) {
      rateLimitStore.delete(ip);
    }
  }
}, 60000);

// Initialize SQLite database with optimizations for concurrency
const db = new Database(DATABASE_PATH);

// Enable WAL mode for better concurrent read/write performance
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = 10000');
db.pragma('temp_store = MEMORY');
db.pragma('busy_timeout = 5000'); // Wait up to 5 seconds if database is locked

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS quizzes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    options TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id TEXT NOT NULL,
    question_text TEXT NOT NULL,
    order_num INTEGER DEFAULT 0,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
  );

  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id TEXT NOT NULL,
    question_id INTEGER NOT NULL,
    selected_option TEXT NOT NULL,
    voter_session TEXT NOT NULL,
    voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
    FOREIGN KEY (question_id) REFERENCES questions(id)
  );
`);

// Create default admin if not exists
const adminExists = db.prepare('SELECT * FROM admins WHERE username = ?').get('admin');
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)').run('admin', hashedPassword);
  console.log('Default admin created - Username: admin');
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Password: ${ADMIN_PASSWORD}`);
  }
}

// ==================== API ROUTES ====================

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  
  if (!admin || !bcrypt.compareSync(password, admin.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  res.json({ success: true, message: 'Login successful' });
});

// Create Quiz (Admin only)
app.post('/api/quiz', (req, res) => {
  const { title, description, options, questions } = req.body;
  
  if (!title || !options || !questions || questions.length === 0) {
    return res.status(400).json({ error: 'Title, options, and at least one question are required' });
  }
  
  const quizId = uuidv4().substring(0, 8);
  
  try {
    db.prepare('INSERT INTO quizzes (id, title, description, options) VALUES (?, ?, ?, ?)')
      .run(quizId, title, description || '', JSON.stringify(options));
    
    const insertQuestion = db.prepare('INSERT INTO questions (quiz_id, question_text, order_num) VALUES (?, ?, ?)');
    
    questions.forEach((q, index) => {
      insertQuestion.run(quizId, q, index);
    });
    
    res.json({ 
      success: true, 
      quizId,
      voteUrl: `/vote.html?id=${quizId}`,
      resultsUrl: `/results.html?id=${quizId}`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create quiz' });
  }
});

// Get All Quizzes (Admin)
app.get('/api/quizzes', (req, res) => {
  const quizzes = db.prepare(`
    SELECT q.*, 
           COUNT(DISTINCT v.voter_session) as total_voters
    FROM quizzes q
    LEFT JOIN votes v ON q.id = v.quiz_id
    GROUP BY q.id
    ORDER BY q.created_at DESC
  `).all();
  
  res.json(quizzes.map(q => ({
    ...q,
    options: JSON.parse(q.options)
  })));
});

// Get Quiz Details
app.get('/api/quiz/:id', (req, res) => {
  const { id } = req.params;
  
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(id);
  
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }
  
  const questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_num').all(id);
  
  res.json({
    ...quiz,
    options: JSON.parse(quiz.options),
    questions
  });
});

// Submit Votes - Optimized for high concurrency
app.post('/api/quiz/:id/vote', (req, res) => {
  const { id } = req.params;
  const { votes, voterSession } = req.body;
  
  // Validate input
  if (!votes || !Array.isArray(votes) || !voterSession) {
    return res.status(400).json({ error: 'Invalid vote data' });
  }
  
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND is_active = 1').get(id);
  
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found or inactive' });
  }
  
  // Check if this session already voted
  const existingVote = db.prepare('SELECT 1 FROM votes WHERE quiz_id = ? AND voter_session = ? LIMIT 1').get(id, voterSession);
  
  if (existingVote) {
    return res.status(400).json({ error: 'You have already voted in this quiz' });
  }
  
  // Retry logic for handling database locks under high load
  const maxRetries = 3;
  let retries = 0;
  
  const submitVote = () => {
    try {
      const insertVote = db.prepare('INSERT INTO votes (quiz_id, question_id, selected_option, voter_session) VALUES (?, ?, ?, ?)');
      
      const transaction = db.transaction(() => {
        for (const vote of votes) {
          insertVote.run(id, vote.questionId, vote.selectedOption, voterSession);
        }
      });
      
      transaction();
      return { success: true };
    } catch (error) {
      if (error.code === 'SQLITE_BUSY' && retries < maxRetries) {
        retries++;
        return null; // Will retry
      }
      throw error;
    }
  };
  
  // Attempt to submit with retries
  const attemptSubmit = () => {
    const result = submitVote();
    if (result) {
      res.json({ success: true, message: 'Vote submitted successfully' });
    } else {
      // Retry with exponential backoff
      setTimeout(attemptSubmit, Math.pow(2, retries) * 100);
    }
  };
  
  try {
    attemptSubmit();
  } catch (error) {
    console.error('Vote submission error:', error);
    res.status(500).json({ error: 'Failed to submit vote. Please try again.' });
  }
});

// Get Quiz Results
app.get('/api/quiz/:id/results', (req, res) => {
  const { id } = req.params;
  
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(id);
  
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }
  
  const questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_num').all(id);
  const options = JSON.parse(quiz.options);
  
  const results = questions.map(question => {
    const voteCounts = {};
    
    options.forEach(opt => {
      const count = db.prepare(`
        SELECT COUNT(*) as count 
        FROM votes 
        WHERE quiz_id = ? AND question_id = ? AND selected_option = ?
      `).get(id, question.id, opt);
      
      voteCounts[opt] = count ? count.count : 0;
    });
    
    return {
      questionId: question.id,
      questionText: question.question_text,
      votes: voteCounts
    };
  });
  
  const totalVoters = db.prepare(`
    SELECT COUNT(DISTINCT voter_session) as count 
    FROM votes 
    WHERE quiz_id = ?
  `).get(id);
  
  res.json({
    quiz: {
      ...quiz,
      options
    },
    results,
    totalVoters: totalVoters ? totalVoters.count : 0
  });
});

// Toggle Quiz Status
app.patch('/api/quiz/:id/toggle', (req, res) => {
  const { id } = req.params;
  
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(id);
  
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }
  
  const newStatus = quiz.is_active ? 0 : 1;
  db.prepare('UPDATE quizzes SET is_active = ? WHERE id = ?').run(newStatus, id);
  
  res.json({ success: true, is_active: newStatus });
});

// Update Quiz (only if no votes exist)
app.put('/api/quiz/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, options, questions } = req.body;
  
  // Check if quiz exists
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(id);
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }
  
  // Check if there are any votes
  const voteCount = db.prepare('SELECT COUNT(*) as count FROM votes WHERE quiz_id = ?').get(id);
  if (voteCount.count > 0) {
    return res.status(400).json({ error: 'Cannot edit poll with existing votes' });
  }
  
  // Validate input
  if (!title || !options || !questions || questions.length === 0) {
    return res.status(400).json({ error: 'Title, options, and at least one question are required' });
  }
  
  try {
    // Update quiz
    db.prepare('UPDATE quizzes SET title = ?, description = ?, options = ? WHERE id = ?')
      .run(title, description || '', JSON.stringify(options), id);
    
    // Delete old questions and insert new ones
    db.prepare('DELETE FROM questions WHERE quiz_id = ?').run(id);
    
    const insertQuestion = db.prepare('INSERT INTO questions (quiz_id, question_text, order_num) VALUES (?, ?, ?)');
    questions.forEach((q, index) => {
      insertQuestion.run(id, q, index);
    });
    
    res.json({ 
      success: true, 
      message: 'Poll updated successfully',
      quizId: id
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Failed to update poll' });
  }
});

// Delete Quiz
app.delete('/api/quiz/:id', (req, res) => {
  const { id } = req.params;
  
  try {
    db.prepare('DELETE FROM votes WHERE quiz_id = ?').run(id);
    db.prepare('DELETE FROM questions WHERE quiz_id = ?').run(id);
    db.prepare('DELETE FROM quizzes WHERE id = ?').run(id);
    
    res.json({ success: true, message: 'Quiz deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

// Get Leaderboard - Option rankings across all questions for a quiz
app.get('/api/quiz/:id/leaderboard', (req, res) => {
  const { id } = req.params;
  
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(id);
  
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }
  
  const options = JSON.parse(quiz.options);
  const questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_num').all(id);
  
  // Calculate total votes for each option across all questions
  const optionTotals = {};
  options.forEach(opt => {
    const result = db.prepare(`
      SELECT COUNT(*) as count 
      FROM votes 
      WHERE quiz_id = ? AND selected_option = ?
    `).get(id, opt);
    optionTotals[opt] = result ? result.count : 0;
  });
  
  // Sort options by vote count (descending)
  const leaderboard = Object.entries(optionTotals)
    .map(([option, votes]) => ({ option, votes }))
    .sort((a, b) => b.votes - a.votes);
  
  // Get total votes
  const totalVotes = leaderboard.reduce((sum, item) => sum + item.votes, 0);
  
  // Get per-question breakdown
  const questionBreakdown = questions.map(question => {
    const optionVotes = {};
    options.forEach(opt => {
      const result = db.prepare(`
        SELECT COUNT(*) as count 
        FROM votes 
        WHERE quiz_id = ? AND question_id = ? AND selected_option = ?
      `).get(id, question.id, opt);
      optionVotes[opt] = result ? result.count : 0;
    });
    
    // Find winner for this question
    const winner = Object.entries(optionVotes)
      .sort((a, b) => b[1] - a[1])[0];
    
    return {
      questionId: question.id,
      questionText: question.question_text,
      votes: optionVotes,
      winner: winner[1] > 0 ? { option: winner[0], votes: winner[1] } : null
    };
  });
  
  const totalVoters = db.prepare(`
    SELECT COUNT(DISTINCT voter_session) as count 
    FROM votes 
    WHERE quiz_id = ?
  `).get(id);
  
  res.json({
    quiz: {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      options
    },
    leaderboard,
    questionBreakdown,
    totalVotes,
    totalVoters: totalVoters ? totalVoters.count : 0,
    totalQuestions: questions.length
  });
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint (for load balancers and monitoring)
app.get('/api/health', (req, res) => {
  try {
    // Quick database check
    db.prepare('SELECT 1').get();
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Admin panel: http://localhost:${PORT}/admin.html`);
  console.log(`⚡ SQLite WAL mode enabled for high concurrency`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed');
    db.close();
    console.log('Database connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed');
    db.close();
    console.log('Database connection closed');
    process.exit(0);
  });
});

