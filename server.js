const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

// Store game states in memory (in production, you'd want to use a database)
const gameStates = {};

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Get game state
app.get('/api/game/:room', (req, res) => {
    const room = req.params.room;
    res.json(gameStates[room] || { wordList: [], activeGame: [], players: [], scores: 0 });
});

// Update game state
app.post('/api/game/:room', (req, res) => {
    const room = req.params.room;
    gameStates[room] = req.body;
    res.json({ success: true });
});

// Check if room exists
app.get('/api/room/:room/exists', (req, res) => {
    const room = req.params.room;
    res.json({ exists: !!gameStates[room] });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 