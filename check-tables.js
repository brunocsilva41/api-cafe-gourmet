const mysql = require('mysql2');
require('dotenv').config();

console.log('🔍 Verificando tabelas no banco Railway...');

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

connection.connect((err) => {
    if (err) {
        console.error('❌ Erro na conexão:', err.message);
        process.exit(1);
    }
    
    console.log('✅ Conectado ao banco Railway!');
    
    // Verificar quais tabelas existem
    connection.query('SHOW TABLES', (error, results) => {
        if (error) {
            console.error('❌ Erro ao listar tabelas:', error);
            connection.end();
            return;
        }
        
        console.log('\n📋 Tabelas existentes no banco:');
        if (results.length === 0) {
            console.log('❌ Nenhuma tabela encontrada no banco!');
            console.log('\n💡 Você precisa executar o script database-setup.sql para criar as tabelas.');
        } else {
            results.forEach((row, index) => {
                const tableName = Object.values(row)[0];
                console.log(`${index + 1}. ${tableName}`);
            });
        }
        
        // Verificar se a tabela usuarios existe
        const tablesNeeded = ['usuarios', 'produtos'];
        const existingTables = results.map(row => Object.values(row)[0]);
        
        console.log('\n🔍 Verificando tabelas necessárias:');
        tablesNeeded.forEach(table => {
            if (existingTables.includes(table)) {
                console.log(`✅ Tabela '${table}' encontrada`);
            } else {
                console.log(`❌ Tabela '${table}' NÃO encontrada`);
            }
        });
        
        connection.end();
        console.log('\n🔚 Verificação concluída.');
    });
});
