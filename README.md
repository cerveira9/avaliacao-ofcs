# Backend - Sistema de Avaliação de Oficiais

Este backend é uma API REST construída com Node.js e Express, conectada ao MongoDB, responsável pela gestão de oficiais e avaliações de desempenho.

## Tecnologias
- Node.js
- Express
- MongoDB com Mongoose
- Cors
- Nodemon (desenvolvimento)

## Rotas Disponíveis

### Oficiais

- **POST /cadastroOficial**
  - Cria um novo oficial.
  - Campos: `name`, `rank`, `startDate`

- **GET /mostrarOficiais**
  - Lista todos os oficiais ordenados por hierarquia.
  - Cada oficial traz junto a contagem de avaliações feitas.

- **PUT /atualizarOficial/:id**
  - Atualiza dados de um oficial.

- **DELETE /deletarOficial/:id**
  - Remove um oficial.

### Avaliações

- **POST /evaluations/cadastrarAvaliacao**
  - Cadastra uma nova avaliação para um oficial.
  - Campos: `officerId`, `skills` (objeto com notas)

- **GET /evaluations/:officerId**
  - Lista todas as avaliações de um oficial específico.

## Estrutura de Dados

### Officer
```json
{
  "name": "John Doe",
  "rank": "Cadete",
  "startDate": "2025-04-01"
}
