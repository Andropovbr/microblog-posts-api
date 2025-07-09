const express = require('express');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

let dbPool;

// Função para buscar o segredo do Secrets Manager
async function getDatabaseCredentials() {
    const secretArn = process.env.DB_SECRET_ARN;
    if (!secretArn) {
        console.error("A variável de ambiente DB_SECRET_ARN não está definida.");
        throw new Error("Segredo do DB não configurado.");
    }

    const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
    const command = new GetSecretValueCommand({ SecretId: secretArn });

    try {
        const data = await client.send(command);
        if ('SecretString' in data) {
            return JSON.parse(data.SecretString);
        }
        throw new Error("Formato de segredo inesperado.");
    } catch (err) {
        console.error("Erro ao buscar o segredo:", err);
        throw err;
    }
}

// Função para inicializar a conexão com o banco de dados e criar a tabela
async function initializeDatabase() {
    try {
        const credentials = await getDatabaseCredentials();
        
        dbPool = new Pool({
            host: credentials.host,
            port: credentials.port,
            user: credentials.username,
            password: credentials.password,
            database: credentials.dbname,
            ssl: {
                // Necessário para conectar ao RDS, que exige SSL
                rejectUnauthorized: false 
            }
        });

        // Conecta e cria a tabela se ela não existir
        const client = await dbPool.connect();
        console.log("Conectado ao banco de dados com sucesso!");

        await client.query(`
            CREATE TABLE IF NOT EXISTS posts (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Tabela 'posts' verificada/criada com sucesso.");
        
        // Insere alguns dados de exemplo se a tabela estiver vazia
        const res = await client.query('SELECT COUNT(*) FROM posts');
        if (res.rows[0].count === '0') {
            await client.query(`
                INSERT INTO posts (title, content) VALUES
                ('Terraform é incrível', 'Construímos tudo com IaC.'),
                ('ECS e Fargate', 'Orquestração de contentores sem gerir servidores.'),
                ('Pipeline com GitHub Actions', 'CI/CD completo e moderno!');
            `);
            console.log("Dados de exemplo inseridos na tabela 'posts'.");
        }

        client.release();

    } catch (err) {
        console.error("Falha ao inicializar o banco de dados:", err);
        // Se a inicialização falhar, a aplicação não deve subir
        process.exit(1);
    }
}

// Rotas da API
app.get('/', (req, res) => {
  res.status(200).send('API de Posts está saudável!');
});

app.get('/api/posts', async (req, res) => {
    try {
        const client = await dbPool.connect();
        const result = await client.query('SELECT * FROM posts ORDER BY created_at DESC');
        client.release();
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao buscar posts:", err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Inicia o servidor após inicializar o banco de dados
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`API de Posts a correr na porta ${PORT}`);
    });
});
