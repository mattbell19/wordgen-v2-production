import express from 'express';
const app = express();

app.get('/test', (req, res) => {
  res.json({ status: 'ok' });
});

const port = 3004;
app.listen(port, '0.0.0.0', () => {
  console.log(`Test server running on port ${port}`);
}); 