const mysql = require('mysql2');
require('dotenv').config();

console.log('🔍 Testando conexão com o banco Railway...');
console.log('📊 Configurações:');
console.log(`Host: ${process.env.DB_HOST}`);
console.log(`User: ${process.env.DB_USER}`);
console.log(`Database: ${process.env.DB_NAME}`);
console.log(`Port: ${process.env.DB_PORT}`);

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
});

connection.connect((err) => {
    if (err) {
        console.error('❌ Erro na conexão:', err.message);
        console.error('Código do erro:', err.code);
        process.exit(1);
    } else {
        console.log('✅ Conexão estabelecida com sucesso!');
        
        // Teste simples de query
        connection.query('SELECT * from usuarios', (error, results) => {
            if (error) {
                console.error('❌ Erro na query de teste:', error);
            } else {
                console.log('✅ Query de teste executada com sucesso:', results);
            }
            
            connection.end();
            console.log('🔚 Conexão encerrada.');
        });
    }
});
