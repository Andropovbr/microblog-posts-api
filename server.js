const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

// NOVO: Middleware para o Express entender o corpo de requisições JSON
app.use(express.json());

let dbPool;

// Função para ler as credenciais diretamente do ambiente
function getDatabaseCredentials() {
    const secretJson = process.env.DB_SECRET_ARN;
    if (!secretJson) {
        console.error("A variável de ambiente com o segredo do DB (DB_SECRET_ARN) não está definida.");
        throw new Error("Segredo do DB não configurado.");
    }
    try {
        return JSON.parse(secretJson);
    } catch (err) {
        console.error("Erro ao fazer o parse do segredo JSON:", err);
        throw err;
    }
}

// Função para inicializar a conexão com o banco de dados e criar a tabela
async function initializeDatabase() {
    try {
        const credentials = getDatabaseCredentials();
        dbPool = new Pool({
            host: credentials.host,
            port: credentials.port,
            user: credentials.username,
            password: credentials.password,
            database: credentials.dbname,
            ssl: { rejectUnauthorized: false }
        });

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

// NOVO: Rota para criar um novo post
app.post('/api/posts', async (req, res) => {
    const { title, content } = req.body;

    if (!title || !content) {
        return res.status(400).json({ error: 'Título e conteúdo são obrigatórios.' });
    }

    try {
        const client = await dbPool.connect();
        const result = await client.query(
            'INSERT INTO posts (title, content) VALUES ($1, $2) RETURNING *',
            [title, content]
        );
        client.release();
        // Retorna o post recém-criado
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao criar post:", err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Inicia o servidor após inicializar o banco de dados
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`API de Posts a correr na porta ${PORT}`);
    });
});