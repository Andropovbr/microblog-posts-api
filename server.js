const express = require('express');
const app = express();
const PORT = 3000;

// Rota de health check para o Load Balancer
app.get('/', (req, res) => {
  res.status(200).send('API de Posts está saudável!');
});

// Rota principal da API
app.get('/api/posts', (req, res) => {
  // No futuro, aqui iremos buscar os posts ao banco de dados
  const dummyPosts = [
    { id: 1, title: 'Terraform é incrível', content: 'Construímos tudo com IaC.' },
    { id: 2, title: 'ECS e Fargate', content: 'Orquestração de contentores sem gerir servidores.' }
  ];
  res.json(dummyPosts);
});

app.listen(PORT, () => {
  console.log(`API de Posts a correr na porta ${PORT}`);
  // No futuro, aqui vamos ler o segredo e conectar ao RDS
  if (process.env.DB_SECRET_ARN) {
      console.log(`A tentar usar o segredo: ${process.env.DB_SECRET_ARN}`);
  } else {
      console.log("Segredo do DB não encontrado. A correr em modo local.");
  }
});
