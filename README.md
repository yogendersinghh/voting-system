# 🗳️ VoteCast - Anonymous Voting Platform

A modern, anonymous voting platform where admins can create polls with multiple questions (all sharing the same options) and generate unique URLs for voters.

## ✨ Features

- **Anonymous Voting**: No user registration required for voters
- **Admin Panel**: Secure admin area to create and manage polls
- **Multi-Step Voting**: Beautiful step-by-step voting experience
- **Searchable Dropdown**: Easy option selection with search
- **Real-time Results**: View vote counts and percentages
- **Leaderboard**: See which options get the most votes across all questions
- **Unique URLs**: Generate shareable links for voting and results
- **Mobile Responsive**: Works perfectly on all devices
- **Vote Tracking**: Prevent duplicate votes using session tracking

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Server

```bash
npm start
```

### 3. Access the Application

- **Home Page**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin.html
- **Default Admin Credentials**: 
  - Username: `admin`
  - Password: `admin123`

## 📖 How to Use

### For Admins

1. Navigate to the Admin Panel (`/admin.html`)
2. Login with admin credentials
3. Create a new poll:
   - Enter poll title and description
   - Add voting options (e.g., "Excellent", "Good", "Average", "Poor")
   - Add questions that will use these options
4. After creating the poll, copy the generated URLs:
   - **Vote URL**: Share with voters
   - **Results URL**: View real-time results
   - **Leaderboard URL**: See option rankings (admin only)

### For Voters

1. Access the Vote URL shared by the admin
2. Answer all questions by selecting an option for each
3. Navigate between questions using Previous/Next buttons
4. Submit your vote
5. View results (optional)

## 📁 Project Structure

```
voting/
├── server.js           # Express backend server
├── package.json        # Dependencies and scripts
├── voting.db          # SQLite database (created on first run)
├── public/
│   ├── index.html     # Landing page
│   ├── admin.html     # Admin dashboard
│   ├── vote.html      # Voting page
│   ├── results.html   # Results display
│   ├── leaderboard.html # Leaderboard (admin only)
│   ├── css/
│   │   └── style.css  # Styling
│   └── js/
│       ├── admin.js   # Admin functionality
│       ├── vote.js    # Voting functionality
│       └── results.js # Results display
├── .gitignore        # Git ignore file
├── Procfile          # Heroku/Railway deployment
└── DEPLOYMENT.md     # Detailed deployment guide
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Admin authentication |
| POST | `/api/quiz` | Create new poll |
| GET | `/api/quizzes` | Get all polls (admin) |
| GET | `/api/quiz/:id` | Get poll details |
| POST | `/api/quiz/:id/vote` | Submit votes |
| GET | `/api/quiz/:id/results` | Get poll results |
| GET | `/api/quiz/:id/leaderboard` | Get leaderboard (admin) |
| PATCH | `/api/quiz/:id/toggle` | Activate/deactivate poll |
| DELETE | `/api/quiz/:id` | Delete poll |

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database**: SQLite (better-sqlite3)
- **Authentication**: bcryptjs for password hashing

## 🌐 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy Options:

1. **Railway** (Easiest)
   - Connect GitHub repo
   - Auto-deploys on push
   - Free tier available

2. **Render**
   - Connect GitHub repo
   - Free tier with SSL
   - Auto-deploys

3. **Heroku**
   - Use Procfile included
   - `git push heroku main`

4. **VPS** (DigitalOcean, Linode)
   - Full control
   - Use PM2 for process management

### Environment Variables:

```env
PORT=3000
ADMIN_PASSWORD=your-secure-password
DATABASE_PATH=voting.db
```

## 🔒 Security Notes

- Change default admin password in production
- Use environment variables for sensitive data
- Enable HTTPS/SSL in production
- Regular database backups recommended

## 📝 License

MIT

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

---

**Built with ❤️ for anonymous, fair voting**
