import express from 'express'
import {matchRouter} from "./routes/matches.js";

const app = express();
const port = 8000;

app.use(express.json());

app.get('/', (req, res) => {
    if (!req.body) {
        return res.status(400).send('No body provided');
    }
    res.send('Hello from Express Server!')
});

app.use('/matches', matchRouter);

app.listen(port, () => console.log(`Server running on port ${port}`));