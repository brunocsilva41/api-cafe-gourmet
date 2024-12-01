const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');

const router = express.Router();

router.post('/criar-conta', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 3 }).trim().escape(),
    body('name').isLength({min: 1}).trim().escape(),
    body('address').optional().trim().escape(),
    body('phone').optional().trim().escape()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { name, email, password, address, phone } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const role = 'user';

    const sql = `INSERT INTO usuarios (nome, email, senha, endereco, telefone_usuario, role) VALUES (?, ?, ?, ?, ?, ?)`;
    const values = [name || null, email, hashedPassword, address || null, phone || null, role];

    db.query(sql, values, (err, result) => {
        if (err) throw err;
        res.status(201).json({ message: 'Conta criada com sucesso!' });
    });
});

router.post('/login-conta', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 1 }).trim().escape()
], (req, res) => {
    console.log('Dados recebidos para login:', req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('Erros de validação:', errors.array()); 
        return res.status(400).json({ errors: errors.array() });
    }
    const { email, password } = req.body;
    const sql = `SELECT * FROM usuarios WHERE email = ?`;
    db.query(sql, [email], async (err, result) => {
        if (err) {
            console.error('Erro na consulta ao banco de dados:', err); 
            return res.status(500).json({ message: 'Erro no servidor' });
        }
        if (result.length > 0) {
            const user = result[0];
            console.log('Usuário encontrado:', user); 
            const match = await bcrypt.compare(password, user.senha);
            if (match) {
                const token = jwt.sign(
                    { userId: user.Id, role: user.role },
                    process.env.JWT_SECRET,
                    { expiresIn: '1h' }
                );
                console.log('Login realizado com sucesso, gerando token'); 
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
                console.log('Senha inválida'); 
                res.status(401).json({ message: 'Senha inválida' });
            }
        } else {
            console.log('Usuário não encontrado');
            res.status(401).json({ message: 'Usuário não encontrado' });
        }
    });
});

router.post('/criar-conta-social', [
    body('email').isEmail().normalizeEmail(),
    body('name').isLength({ min: 1 }).trim().escape(),
    body('password').isLength({ min: 3 }).trim().escape()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const role = 'user';

    const sql = `INSERT INTO usuarios (nome, email, senha, role) VALUES (?, ?, ?, ?)`;
    const values = [name, email, hashedPassword, role];

    db.query(sql, values, (err, result) => {
        if (err) throw err;
        const token = jwt.sign(
            { userId: result.insertId, role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        res.status(201).json({ message: 'Conta criada com sucesso!', token });
    });
});

router.post('/login-social', [
    body('email').isEmail().normalizeEmail()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { email } = req.body;
    const sql = `SELECT * FROM usuarios WHERE email = ?`;
    db.query(sql, [email], async (err, result) => {
        if (err) {
            console.error('Erro na consulta ao banco de dados:', err);
            return res.status(500).json({ message: 'Erro no servidor' });
        }
        if (result.length > 0) {
            const user = result[0];
            const token = jwt.sign(
                { userId: user.Id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );
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
            res.status(401).json({ message: 'Usuário não encontrado' });
        }
    });
});
router.post('/consulta-usuario', []
    , async (req, res) => {
        const { email } = req.body;
        const sql = 'SELECT * FROM usuarios WHERE email = ?';
        db.query(sql, [email], async (err, result) => {
            if (err) {
                console.error('Erro na consulta ao banco de dados:', err);
                return res.status(500).json({ message: 'Erro no servidor' });
            }
            if (result.length > 0) {
                const user = result[0];
                res.status(200).json({
                    message: 'Usuário encontrado com sucesso!',
                    userId: user.Id,
                    userName: user.nome,
                    userEmail: user.email,
                    userAddress: user.endereco,
                    userPhone: user.telefone_usuario,
                    userImage: user.imagem_usuario,
                    role: user.role,
                });
            } else {
                res.status(401).json({ message: 'Usuário não encontrado' });
            }
        });
    });


router.get('/usuarios', (req, res) => {
    const sql = 'SELECT Id, nome, email, role , endereco ,telefone_usuario FROM usuarios';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: 'Erro no servidor' });
        res.status(200).json(results);
    });
});

router.put('/usuarios/:id', [
    body('Id').isInt(),
    body('name').optional().trim().escape(),
    body('email').optional().isEmail().normalizeEmail(),
    body('role').optional().isIn(['admin', 'user']),
    body('endereco').optional().trim().escape(),
    body('telefone_usuario').optional().trim().escape(),
], async (req, res) => {
    const { id } = req.params;
    const { Id, name, email, role, endereco, telefone_usuario } = req.body;

    if (parseInt(id) !== Id) {
        return res.status(400).json({ message: 'ID na URL e no corpo não correspondem' });
    }

    let sql = 'UPDATE usuarios SET ';
    let updates = [];
    let values = [];

    if (name) {
        updates.push('nome = ?');
        values.push(name);
    }
    if (email) {
        updates.push('email = ?');
        values.push(email);
    }
    if (role) {
        updates.push('role = ?');
        values.push(role);
    }
    if (endereco) {
        updates.push('endereco = ?');
        values.push(endereco);
    }
    if (telefone_usuario !== undefined) {
        updates.push('telefone_usuario = ?');
        values.push(telefone_usuario);
    }

    if (updates.length === 0) {
        return res.status(400).json({ message: 'Nenhum campo para atualizar' });
    }

    sql += updates.join(', ') + ' WHERE Id = ?';
    values.push(id);

    try {
        const [result] = await db.promise().query(sql, values);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        const [updatedUser] = await db.promise().query('SELECT Id, nome, email, role, endereco, telefone_usuario FROM usuarios WHERE Id = ?', [id]);
        res.status(200).json({ message: 'Usuário atualizado com sucesso!', user: updatedUser[0] });
    } catch (err) {
        console.error('Erro ao atualizar usuário:', err);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

router.put('/editar-cadastro', verificarAutenticacao, [
    body('Id').isInt(),
    body('nome').optional().trim().escape(),
    body('email').optional().isEmail().normalizeEmail(),
    body('role').optional().isIn(['admin', 'user']),
    body('endereco').optional().trim().escape(),
    body('telefone_usuario').optional().trim().escape()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { Id, nome, email, role, endereco, telefone_usuario } = req.body;
    let sql = 'UPDATE usuarios SET ';
    let updates = [];
    let values = [];

    if (nome) {
        updates.push('nome = ?');
        values.push(nome);
    }
    if (email) {
        updates.push('email = ?');
        values.push(email);
    }
    if (role) {
        updates.push('role = ?');
        values.push(role);
    }
    if (endereco) {
        updates.push('endereco = ?');
        values.push(endereco);
    }
    if (telefone_usuario) {
        updates.push('telefone_usuario = ?');
        values.push(telefone_usuario);
    }

    if (updates.length === 0) {
        return res.status(400).json({ message: 'Nenhum campo para atualizar' });
    }

    sql += updates.join(', ') + ' WHERE Id = ?';
    values.push(Id);

    try {
        const [result] = await db.promise().query(sql, values);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        const [updatedUser] = await db.promise().query('SELECT Id, nome, email, role, endereco, telefone_usuario FROM usuarios WHERE Id = ?', [Id]);
        res.status(200).json({ message: 'Cadastro atualizado com sucesso!', user: updatedUser[0] });
    } catch (err) {
        console.error('Erro ao atualizar cadastro:', err);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

router.put('/recuperar-senha', async (req, res) => {
    const { email } = req.body;
    const sql = 'SELECT * FROM usuarios WHERE email = ?';
    db.query(sql, [email], async (err, result) => {
        if (err) {
            console.error('Erro na consulta ao banco de dados:', err);
            return res.status(500).json({ message: 'Erro no servidor' });
        }
        if (result.length > 0) {
            const tempPassword = Math.random().toString(36).slice(-6);
            const hashedPassword = await bcrypt.hash(tempPassword, 10);
            const updateSql = 'UPDATE usuarios SET senha = ? WHERE email = ?';
            db.query(updateSql, [hashedPassword, email], async (err, result) => {
                if (err) {
                    console.error('Erro ao atualizar senha no banco de dados:', err);
                    return res.status(500).json({ message: 'Erro no servidor' });
                }

                // Enviar email com a senha temporária
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS,
                    },
                });

                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: 'Recuperação de Senha',
                    text: `Sua nova senha temporária é: ${tempPassword}`,
                };

                try {
                    await transporter.sendMail(mailOptions);
                    res.status(200).json({ message: 'Senha alterada com sucesso! Verifique seu email para a nova senha.' });
                } catch (error) {
                    console.error('Erro ao enviar email:', error);
                    res.status(500).json({ message: 'Erro ao enviar email', error: error.message });
                }
            });
        } else {
            res.status(404).json({ message: 'Usuário não encontrado' });
        }
    });
});

router.delete('/usuarios/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM usuarios WHERE Id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Erro no servidor' });
        res.status(200).json({ message: 'Usuário deletado com sucesso!' });
    });
});

const requestLogs = [];

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

router.get('/logs', (req, res) => {
    res.status(200).json(requestLogs);
});

function verificarAutenticacao(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(403).json({ message: 'Token não fornecido' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(500).json({ message: 'Falha na autenticação' });
        req.userId = decoded.userId;
        next();
    });
}

router.get('/admin-dashboard', verificarAutenticacao, (req, res) => {
    res.status(200).json({ message: 'Acesso autorizado' });
});

router.get('/api/produtos', (req, res) => {
    console.log('Recebida requisição para /api/produtos');
    const sql = 'SELECT id, name, preco, categoria, quantidade, imagem FROM produtos';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Erro ao buscar produtos:', err);
            return res.status(500).json({ message: 'Erro no servidor' });
        }
        console.log('Produtos recuperados:', results);
        res.status(200).json(results);
    });
});

router.get('/api/produtos/:id', (req, res) => {
    const { id } = req.params; 
    console.log(`Buscando produto com ID: ${id}`); 
    const sql = 'SELECT * FROM produtos WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.log('Erro ao buscar produto:', err);
            console.error('Erro ao buscar produto:', err);
            return res.status(500).json({ message: 'Erro no servidor' });
        }
        if (result.length === 0) {
            console.warn(`Produto com ID ${id} não encontrado`);
            return res.status(404).json({ message: 'Produto não encontrado' });
        }
        console.log('Produto recuperado:', result[0]);
        res.status(200).json(result[0]);
    });
});

router.get('/api/user-details/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT  id , nome, email, data_criacao, endereco, telefone_usuario, imagem_usuario FROM usuarios WHERE Id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Erro no servidor' });
        if (result.length === 0) return res.status(404).json({ message: 'Usuário não encontrado' });
        res.status(200).json(result[0]);
    });
});

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

router.post('/api/send-email', async (req, res) => {
    const { to, subject, text } = req.body;
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS);

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        text,
    };

    try {
        console.log('Tentando enviar email para:', to);
        await transporter.sendMail(mailOptions);
        console.log('Email enviado com sucesso para:', to);
        res.status(200).json({ message: 'Email enviado com sucesso!' });
    } catch (error) {
        console.error('Erro ao enviar email:', error);
        res.status(500).json({ message: 'Erro ao enviar email', error: error.message });
    }
});

router.post('/api/reset-password', verificarAutenticacao, [
    body('userId').isInt(),
    body('currentPassword').isLength({ min: 3 }).trim().escape(),
    body('newPassword').isLength({ min: 3 }).trim().escape()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { userId, currentPassword, newPassword } = req.body;

    try {
        const sql = 'SELECT senha FROM usuarios WHERE Id = ?';
        const [result] = await db.promise().query(sql, [userId]);

        if (result.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        const user = result[0];
        const match = await bcrypt.compare(currentPassword, user.senha);

        if (!match) {
            return res.status(401).json({ message: 'Senha atual incorreta' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        const updateSql = 'UPDATE usuarios SET senha = ? WHERE Id = ?';
        await db.promise().query(updateSql, [hashedNewPassword, userId]);

        res.status(200).json({ success: true, message: 'Senha alterada com sucesso!' });
    } catch (error) {
        console.error('Erro ao alterar a senha:', error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

module.exports = router;