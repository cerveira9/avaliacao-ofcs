const request = require("supertest");
const http = require("http");
const app = require("../server"); // Certifique-se de que este é o arquivo onde o app Express é inicializado

let server;

beforeAll((done) => {
  server = http.createServer(app); // Cria o servidor HTTP
  server.listen(0, () => { // Usa uma porta aleatória
    done();
  });
});

afterAll((done) => {
  server.close(done); // Fecha o servidor após os testes
});

describe("GET /", () => {
  it("should return 200 OK", async () => {
    const res = await request(server).get("/"); // Use o servidor HTTP aqui
    expect(res.statusCode).toBe(200);
  });

  afterAll(async () => {
    const mongoose = require("mongoose");
    await mongoose.connection.close();
  });
});