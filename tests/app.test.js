const request = require("supertest");
const http = require("http");
const app = require("../server"); // Certifique-se de que este é o arquivo onde o app Express é inicializado
const mongoose = require("mongoose");

let server;

beforeAll((done) => {
  server = http.createServer(app); // Cria o servidor HTTP
  server.listen(0, () => { // Usa uma porta aleatória
    done();
  });
});

afterAll(async () => {
  // Fecha o servidor HTTP
  await new Promise((resolve) => server.close(resolve));

  // Fecha a conexão com o MongoDB
  await mongoose.connection.close();
});

describe("GET /", () => {
  it("should return 200 OK", async () => {
    const res = await request(server).get("/"); // Use o servidor HTTP aqui
    expect(res.statusCode).toBe(200);
  });
});