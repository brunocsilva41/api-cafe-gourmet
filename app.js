const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); 
const app = express();
const routes = require('./routes');
require('dotenv').config();

const allowedOrigins = [
    origin = '*',
    'http://localhost:3000',
    'http://localhost:3000/produtos',
    'http://localhost:3000/conta',
    'http://localhost:3000/login',
    'http://localhost:3000/criar-conta',
    'http://localhost:3000/admin-dashboard',
    'http://localhost:3000/usuarios',
    'http://localhost:3000/logs',
    'http://localhost:3000/api/produtos',
    'http://localhost:3000/api/produtos/:id',
    'http://localhost:3000/usuarios/:id',
    'https://coffeforyou.netlify.app',
    'https://coffeforyou.netlify.app/produtos',
    'https://coffeforyou.netlify.app/login-conta',
    'https://coffeforyou.netlify.app/criar-conta',
    'https://coffeforyou.netlify.app/admin-dashboard',
    'https://coffeforyou.netlify.app/usuarios',
    'https://coffeforyou.netlify.app/logs',
    'https://coffeforyou.netlify.app/api/produtos',
    'https://coffeforyou.netlify.app/api/produtos/:id',
    'https://coffeforyou.netlify.app/usuarios/:id',
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));

app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

app.use('/', routes);

app.use((req, res, next) => {
    res.status(404).json({ message: 'Rota não encontrada' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Erro no servidor' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});

module.exports = app;

