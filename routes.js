const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const mysql = require('mysql2/promise');

const router = express.Router();

// Rota para criar conta
router.post('/criar-conta', [
    body('name').isLength({ min: 1 }).trim().escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 3 }).trim().escape(),
    body('address').isLength({ min: 1 }).trim().escape(),
    body('phone').isLength({ min: 1 }).trim().escape()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { name, email, password, address, phone } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const role = 'user'; // Definir o valor de role como 'user'
    const sql = `INSERT INTO usuarios (nome, email, senha, endereco, telefone_usuario, role) VALUES (?, ?, ?, ?, ?, ?)`;
    db.query(sql, [name, email, hashedPassword, address, phone, role], (err, result) => {
        if (err) throw err;
        res.status(201).json({ message: 'Conta criada com sucesso!' });
    });
});

// Rota para login
router.post('/login-conta', [
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
                    userId: user.id,
                    userName: user.nome,
                    userEmail: user.email,
                    userAddress: user.endereco,
                    userPhone: user.telefone_usuario,
                    userImage: user.imagem_usuario,
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
router.get('/usuarios', (req, res) => {
    const sql = 'SELECT Id, nome, email, role , endereco ,telefone_usuario FROM usuarios';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: 'Erro no servidor' });
        res.status(200).json(results);
    });
});

// Rota para atualizar informações do usuário
router.put('/usuarios/:id', [
    body('name').optional().trim().escape(),
    body('email').optional().isEmail().normalizeEmail(),
    body('role').optional().isIn(['admin', 'user'])  // Role como exemplo de permissão
], (req, res) => {
    const { id } = req.params;
    const { name, email, role , endereco , telefone_usuario } = req.body;
    let sql = 'UPDATE usuarios SET ';
    let updates = [];
    if (name) updates.push(`nome = '${name}'`);
    if (email) updates.push(`email = '${email}'`);
    if (role) updates.push(`role = '${role}'`);
    if(endereco) updates.push(`endereco = '${endereco}'`);
    if(telefone_usuario) updates.push(`telefone_usuario = '${telefone_usuario}'`);

    sql += updates.join(', ') + ' WHERE Id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Erro no servidor' });
        res.status(200).json({ message: 'Usuário atualizado com sucesso!' });
    });
});

// Rota para deletar usuário
router.delete('/usuarios/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM usuarios WHERE Id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Erro no servidor' });
        res.status(200).json({ message: 'Usuário deletado com sucesso!' });
    });
});

// Rota para registrar logs de requisições
const requestLogs = [];  // Em produção, utilizar um banco ou serviço de logs

router.use((req, res, next) => {
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
router.get('/logs', (req, res) => {
    res.status(200).json(requestLogs);
});

// Middleware para proteger rota e verificar correspondência de ID
function verificarAutenticacao(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(403).json({ message: 'Token não fornecido' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(500).json({ message: 'Falha na autenticação' });
        req.userId = decoded.userId;
        next();
    });
}

// Exemplo de rota protegida para o dashboard
router.get('/admin-dashboard', verificarAutenticacao, (req, res) => {
    res.status(200).json({ message: 'Acesso autorizado' });
});

// Rota para buscar produtos na tela produtos.
router.get('/api/produtos', (req, res) => {
    console.log('Recebida requisição para /api/produtos'); // Log para depuração
    const sql = 'SELECT id, name, preco, categoria, quantidade, imagem FROM produtos';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Erro ao buscar produtos:', err); // Log para depuração
            return res.status(500).json({ message: 'Erro no servidor' });
        }
        // Adiciona log para verificar os dados recuperados
        console.log('Produtos recuperados:', results);
        res.status(200).json(results); // Corrigir para retornar o JSON corretamente
    });
});

// Rota para buscar produto por ID
router.get('/api/produtos/:id', (req, res) => {
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

// Rota para buscar detalhes do usuário
router.get('/api/user-details/:id', verificarAutenticacao, (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT id, nome, email, data_criacao, endereco, telefone_usuario, imagem_usuario, role FROM usuarios WHERE Id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Erro no servidor' });
        if (result.length === 0) return res.status(404).json({ message: 'Usuário não encontrado' });
        res.status(200).json(result[0]);
    });
});

// Rota para atualizar todas as informações do usuário
router.put('/api/user-details/:id', verificarAutenticacao, [
    body('name').optional().trim().escape(),
    body('email').optional().isEmail().normalizeEmail(),
    body('address').optional().trim().escape(),
    body('phone').optional().trim().escape(),
    body('role').optional().isIn(['admin', 'user'])
], (req, res) => {
    const { id } = req.params;
    const { name, email, address, phone, role } = req.body;
    let sql = 'UPDATE usuarios SET ';
    let updates = [];
    if (name) updates.push(`nome = '${name}'`);
    if (email) updates.push(`email = '${email}'`);
    if (address) updates.push(`endereco = '${address}'`);
    if (phone) updates.push(`telefone_usuario = '${phone}'`);
    if (role) updates.push(`role = '${role}'`);
    sql += updates.join(', ') + ' WHERE Id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Erro no servidor' });
        res.status(200).json({ message: 'Usuário atualizado com sucesso!' });
    });
});

// Rota para buscar detalhes do usuário
router.get('/api/user-details/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT  id , nome, email, data_criacao, endereco, telefone_usuario, imagem_usuario FROM usuarios WHERE Id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Erro no servidor' });
        if (result.length === 0) return res.status(404).json({ message: 'Usuário não encontrado' });
        res.status(200).json(result[0]);
    });
});

// Rota para upload de imagem do usuário
router.post('/api/upload-image', upload.single('image'), async (req, res) => {
    const userId = req.body.userId;
    const imageData = req.file.buffer; 
    if (!userId || !imageData) {
        return res.status(400).send({ message: 'ID do usuário ou imagem não fornecidos.' });
    }

    try {
        const sqlUpdateBlobQuery = `
            UPDATE usuarios
            SET imagem_usuario = ?
            WHERE Id = ?
        `;

        await db.promise().execute(sqlUpdateBlobQuery, [imageData, userId]);

        
        res.status(200).send({ imageUrl: `data:image/jpeg;base64,${imageData.toString('base64')}` });
    } catch (error) {
        console.error('Erro ao atualizar imagem no banco de dados:', error);
        res.status(500).send({ message: 'Erro ao atualizar imagem do usuário.' });
    }
});

// Rota para obter pedidos
router.get('/obter-pedidos/:userId', async (req, res) => {
    const { userId } = req.params;
    const sql = 'SELECT * FROM pedidos WHERE user_id = ?';
    try {
        const [results] = await db.promise().query(sql, [userId]);
        if (results.length === 0) {
            return res.status(404).json({ message: 'Nenhum pedido encontrado' });
        }
        res.status(200).json(results);
    } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

// Rota para criar pedido
router.post('/criar-pedido', [
    body('userId').isInt(),
    body('produtos').isArray(),
    body('total').isFloat()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('Erros de validação:', errors.array()); 
        return res.status(400).json({ errors: errors.array() });
    }
    const { userId, produtos, total } = req.body;
    console.log('Dados recebidos para criar pedido:', req.body); 

    const produtosTexto = produtos.map(produto => `${produto.id}:${produto.nome}:${produto.quantidade}:${produto.preco}`).join(',');

    const sqlPedido = `INSERT INTO pedidos (user_id, produtos, total) VALUES (?, ?, ?)`;

    try {
        const [result] = await db.promise().execute(sqlPedido, [userId, produtosTexto, total]);
        const pedidoId = result.insertId;

        res.status(201).json({ message: 'Pedido criado com sucesso!', pedidoId });
    } catch (error) {
        console.error('Erro ao criar pedido:', error); 
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

module.exports = router;