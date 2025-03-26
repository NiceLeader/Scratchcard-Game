const express = require('express');
const cors = require('cors');
const app = express();
const port = 8080;

app.use(cors());
app.use(express.json());

// Przykładowe dane
const mockData = {
  lastTime: new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString(), // Wczoraj
  history: [
    { id: 1, address: "0xc38A8C277F831a881dDC836fE4294B41cc295a9D", earn: "You get Common NFT", playtime: "2023-10-29T10:00:00Z" },
    { id: 2, address: "0xc38A8C277F831a881dDC836fE4294B41cc295a9D", earn: "No earn", playtime: "2023-10-28T09:30:00Z" },
    { id: 3, address: "0xc38A8C277F831a881dDC836fE4294B41cc295a9D", earn: "You get T-shirt", playtime: "2023-10-27T14:20:00Z" },
  ]
};

// Endpoint zwracający czas ostatniej gry
app.get('/time/:address', (req, res) => {
  console.log(`Pobrano czas dla adresu: ${req.params.address}`);
  res.json({ result: mockData.lastTime });
});

// Endpoint zwracający historię
app.get('/history/:address', (req, res) => {
  console.log(`Pobrano historię dla adresu: ${req.params.address}`);
  res.json({ history: mockData.history });
});

// Endpoint dodający wpis do historii
app.post('/add', (req, res) => {
  const { address, earn, playtime } = req.body;
  console.log('Dodano wpis:', { address, earn, playtime });
  
  // Dodaj wpis do historii
  mockData.history.unshift({
    id: mockData.history.length + 1,
    address,
    earn,
    playtime
  });
  
  // Aktualizuj ostatni czas gry
  mockData.lastTime = new Date().toISOString();
  
  res.json({ success: true });
});

app.listen(port, () => {
  console.log(`Serwer mock działa na http://localhost:${port}`);
}); 