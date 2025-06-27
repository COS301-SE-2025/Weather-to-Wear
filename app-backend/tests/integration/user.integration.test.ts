import request from "supertest";
import app from "../../src/app";
import { PrismaClient } from "@prisma/client";
import prisma from "../../src/prisma";

// Clean DB for each test run
// const prisma = new PrismaClient();

beforeEach(async () => {
  await prisma.user.deleteMany(); // clears users before each test
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Auth Integration Tests", () => {
  const validUser = {
    name: "Test User",
    email: "testuser@example.com",
    password: "Password!1"
  };

  describe("POST /api/auth/signup", () => {
    it("should register a new user and return a token", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user).toMatchObject({
        name: validUser.name,
        email: validUser.email
      });
    });

    it("should reject duplicate email", async () => {
      // Create once
      await prisma.user.create({
        data: { name: "Dup", email: validUser.email, password: "hash" }
      });
      // Try signup again
      const res = await request(app)
        .post("/api/auth/signup")
        .send(validUser);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already exists/i);
    });

    it("should reject missing fields", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ email: validUser.email, password: validUser.password }); // no name

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Missing required fields");
    });

    it("should reject weak password", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ ...validUser, password: "weakpw" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/password/i);
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      // Register a user with a real hash
      const hashed = await prisma.user.create({
        data: {
          name: validUser.name,
          email: validUser.email,
          password: await require("../../src/modules/auth/auth.utils").hashPassword(validUser.password)
        }
      });
    });

    it("should login with correct credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: validUser.email, password: validUser.password });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user.email).toBe(validUser.email);
    });

    it("should reject wrong password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: validUser.email, password: "WrongPass123!" });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid credentials/i);
    });

    it("should reject non-existent user", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "notfound@example.com", password: "Password!1" });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/not found/i);
    });

    it("should reject missing email or password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: validUser.email }); // missing password

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/missing email or password/i);
    });
  });

  describe("DELETE /api/auth/users/:id", () => {
    let token: string;
    let userId: string;

    beforeEach(async () => {
      // Signup
      const res = await request(app)
        .post("/api/auth/signup")
        .send(validUser);
      token = res.body.token;
      userId = res.body.user.id;
    });

    it("should delete a user when authorized", async () => {
      const res = await request(app)
        .delete(`/api/auth/users/${userId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(userId);
    });

    it("should reject missing token", async () => {
      const res = await request(app)
        .delete(`/api/auth/users/${userId}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/missing token/i);
    });

    it("should reject invalid token", async () => {
      const res = await request(app)
        .delete(`/api/auth/users/${userId}`)
        .set("Authorization", "Bearer badtoken");

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/invalid token/i);
    });

    it("should 400 on invalid user id", async () => {
      const res = await request(app)
        .delete(`/api/auth/users/invalid-id`)
        .set("Authorization", `Bearer ${token}`);

      // Will throw on not found
      expect([400, 404]).toContain(res.status);
    });
  });
});
