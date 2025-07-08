# Estágio 1: Instalar dependências
FROM public.ecr.aws/docker/library/node:18-alpine as dependencies
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

# Estágio 2: Aplicação Final
FROM public.ecr.aws/docker/library/node:18-alpine
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY server.js .

# Expõe a porta que a nossa API usa
EXPOSE 3000

# Comando para iniciar o servidor
CMD [ "node", "server.js" ]
