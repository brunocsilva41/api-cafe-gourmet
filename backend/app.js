const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
require('dotenv').config();
const cors = require('cors'); 
const app = express();
const jwt = require('jsonwebtoken');


app.use(cors({ origin: 'http://localhost:3000' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configuração da conexão com o banco de dados
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});
db.connect(err => {
    if (err) throw err;
    console.log('Conectado ao banco de dados MySQL!');
});

// Rota para criar conta
app.post('/criar-conta', [
    body('name').isLength({ min: 1 }).trim().escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 3 }).trim().escape()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = `INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)`;
    db.query(sql, [name, email, hashedPassword], (err, result) => {
        if (err) throw err;
        res.status(201).json({ message: 'Conta criada com sucesso!' });
    });
});

// Rota para login
app.post('/login-conta', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 1 }).trim().escape()
], (req, res) => {
    console.log('Dados recebidos para login:', req.body); // Adicionar log para depuração
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('Erros de validação:', errors.array()); // Adicionar log para depuração
        return res.status(400).json({ errors: errors.array() });
    }
    const { email, password } = req.body;
    const sql = `SELECT * FROM usuarios WHERE email = ?`;
    db.query(sql, [email], async (err, result) => {
        if (err) {
            console.error('Erro na consulta ao banco de dados:', err); // Adicionar log para depuração
            return res.status(500).json({ message: 'Erro no servidor' });
        }
        if (result.length > 0) {
            const user = result[0];
            console.log('Usuário encontrado:', user); // Adicionar log para depuração
            const match = await bcrypt.compare(password, user.senha);
            if (match) {
                const token = jwt.sign(
                    { userId: user.Id, role: user.role },
                    process.env.JWT_SECRET,
                    { expiresIn: '1h' }
                );
                console.log('Login realizado com sucesso, gerando token'); // Adicionar log para depuração
                res.status(200).json({
                    message: 'Login realizado com sucesso!',
                    token,
                    userId: user.Id,
                    userName: user.nome,
                    userEmail: user.email,
                    role: user.role,
                });
            } else {
                console.log('Senha inválida'); // Adicionar log para depuração
                res.status(401).json({ message: 'Senha inválida' });
            }
        } else {
            console.log('Usuário não encontrado'); // Adicionar log para depuração
            res.status(401).json({ message: 'Usuário não encontrado' });
        }
    });
});
// Rota para listar usuários
app.get('/usuarios', (req, res) => {
    const sql = 'SELECT Id, nome, email, role FROM usuarios';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: 'Erro no servidor' });
        res.status(200).json(results);
    });
});

// Rota para atualizar informações do usuário
app.put('/usuarios/:id', [
    body('name').optional().trim().escape(),
    body('email').optional().isEmail().normalizeEmail(),
    body('role').optional().isIn(['admin', 'user'])  // Role como exemplo de permissão
], (req, res) => {
    const { id } = req.params;
    const { name, email, role } = req.body;
    let sql = 'UPDATE usuarios SET ';
    let updates = [];
    if (name) updates.push(`nome = '${name}'`);
    if (email) updates.push(`email = '${email}'`);
    if (role) updates.push(`role = '${role}'`);
    sql += updates.join(', ') + ' WHERE Id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Erro no servidor' });
        res.status(200).json({ message: 'Usuário atualizado com sucesso!' });
    });
});

// Rota para deletar usuário
app.delete('/usuarios/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM usuarios WHERE Id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Erro no servidor' });
        res.status(200).json({ message: 'Usuário deletado com sucesso!' });
    });
});

// Rota para registrar logs de requisições
const requestLogs = [];  // Em produção, utilizar um banco ou serviço de logs

app.use((req, res, next) => {
    const log = {
        method: req.method,
        path: req.path,
        timestamp: new Date(),
        status: res.statusCode,
    };
    requestLogs.push(log);
    next();
});

// Rota para visualizar logs de requisições
app.get('/logs', (req, res) => {
    res.status(200).json(requestLogs);
});

// Middleware para proteger rota
function verificarAutenticacao(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(403).json({ message: 'Token não fornecido' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(500).json({ message: 'Falha na autenticação' });
        if (decoded.role !== 'admin') return res.status(403).json({ message: 'Acesso negado' });
        req.userId = decoded.userId;
        next();
    });
}

// Exemplo de rota protegida para o dashboard
app.get('/admin-dashboard', verificarAutenticacao, (req, res) => {
    res.status(200).json({ message: 'Acesso autorizado' });
});

// Rota para buscar produtos na tela produtos.
app.get('/api/produtos', (req, res) => {
    const sql = 'SELECT id, name, preco, categoria, quantidade, imagem FROM produtos';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: 'Erro no servidor' });
        // Adiciona log para verificar os dados recuperados
        console.log('Produtos recuperados:', results);
        res.status(200).json(results);
    });
});

// Rota para buscar produto por ID
app.get('/api/produtos/:id', (req, res) => {
    const { id } = req.params; 
    console.log(`Buscando produto com ID: ${id}`); 
    const sql = 'SELECT * FROM produtos WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.log('Erro ao buscar produto:', err); // Log para depuração
            console.error('Erro ao buscar produto:', err); // Log para depuração
            return res.status(500).json({ message: 'Erro no servidor' });
        }
        if (result.length === 0) {
            console.warn(`Produto com ID ${id} não encontrado`); // Log para depuração
            return res.status(404).json({ message: 'Produto não encontrado' });
        }
        console.log('Produto recuperado:', result[0]); // Log para depuração
        res.status(200).json(result[0]);
    });
});

