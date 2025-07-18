const mysql = require('mysql2');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    charset: 'utf8mb4'
};

// Criando a conexão
const db = mysql.createConnection(dbConfig);

// Conectando ao banco
db.connect(err => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
        console.error('Configuração do banco:', {
            host: dbConfig.host,
            user: dbConfig.user,
            database: dbConfig.database,
            port: dbConfig.port
        });
        return;
    }
    console.log('✅ Conectado ao banco de dados MySQL do Railway!');
    console.log(`📍 Host: ${dbConfig.host}`);
    console.log(`🗄️ Database: ${dbConfig.database}`);
});

// Tratamento de erros de conexão
db.on('error', function(err) {
    console.error('Erro na conexão do banco de dados:', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('Reconectando ao banco de dados...');
        db.connect();
    } else {
        throw err;
    }
});

module.exports = db;