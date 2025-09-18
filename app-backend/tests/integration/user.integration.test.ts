// tests/integration/user.integration.test.ts
import request from "supertest";
import app from "../../src/app";
import { PrismaClient } from "@prisma/client";
import prisma from "../../src/prisma";
import path from "path";

// --- Mock S3 utils used by users.controller ---
// (Must match the import path used in the app code.)
jest.mock("../../src/utils/s3", () => {
  return {
    cdnUrlFor: (key: string) => `https://cdn.test/${key}`,
    uploadBufferToS3: jest.fn().mockResolvedValue(undefined),
    putBufferSmart: jest.fn().mockImplementation(({ key }: { key: string }) => ({
      key,
      publicUrl: `https://cdn.test/${key}`,
    })),
  }
});
import * as s3 from "../../src/utils/s3";

// Ensure bucket is set (controller reads process.env.S3_BUCKET_NAME)
beforeAll(() => {
  if (!process.env.S3_BUCKET_NAME) {
    process.env.S3_BUCKET_NAME = "test-bucket";
  }
});

beforeEach(async () => {
  // Clean only users for this file; other suites handle their own data
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Auth Integration Tests", () => {
  const validUser = {
    name: "Test User",
    email: "testuser@example.com",
    password: "Password!1",
  };

  describe("POST /api/auth/signup", () => {
    it("should register a new user and return a token", async () => {
      const res = await request(app).post("/api/auth/signup").send(validUser);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user).toMatchObject({
        name: validUser.name,
        email: validUser.email,
      });
    });

    it("should reject duplicate email", async () => {
      await prisma.user.create({
        data: { name: "Dup", email: validUser.email, password: "hash" },
      });
      const res = await request(app).post("/api/auth/signup").send(validUser);

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
      const { hashPassword } = require("../../src/modules/auth/auth.utils");
      await prisma.user.create({
        data: {
          name: validUser.name,
          email: validUser.email,
          password: await hashPassword(validUser.password),
        },
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
        .send({ email: validUser.email });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/missing email or password/i);
    });
  });

  describe("DELETE /api/auth/users/:id", () => {
    let token: string;
    let userId: string;

    beforeEach(async () => {
      const res = await request(app).post("/api/auth/signup").send(validUser);
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
      const res = await request(app).delete(`/api/auth/users/${userId}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/missing token/i);
    });

    it("should reject invalid token", async () => {
      const res = await request(app)
        .delete(`/api/auth/users/${userId}`)
        .set("Authorization", "Bearer badtoken");

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid token/i);
    });

    it("should 400 on invalid user id", async () => {
      const res = await request(app)
        .delete(`/api/auth/users/invalid-id`)
        .set("Authorization", `Bearer ${token}`);

      expect([400, 404]).toContain(res.status);
    });
  });
});

// ------------------------------------------------------------------------------------------------

describe("Users Controller Integration", () => {
  // helper to sign up and grab token/user
  async function signupUser(overrides?: Partial<{ name: string; email: string; password: string }>) {
    const base = {
      name: "Me User",
      email: `meuser+${Date.now()}@example.com`,
      password: "Password!1",
    };
    const body = { ...base, ...(overrides || {}) };
    const res = await request(app).post("/api/auth/signup").send(body);
    expect(res.status).toBe(201);
    return { token: res.body.token as string, user: res.body.user as { id: string; email: string } };
  }

  describe("GET /api/users/me", () => {
    it("requires auth", async () => {
      const res = await request(app).get("/api/users/me");
      expect(res.status).toBe(401);
      expect(res.body.message || res.body.error).toMatch(/unauthorized|missing token/i);
    });

    it("returns the current user's profile", async () => {
      const { token, user } = await signupUser();
      const res = await request(app)
        .get("/api/users/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("user");
      expect(res.body.user).toMatchObject({
        id: user.id,
        email: user.email,
      });
      // the controller selects these fields in service
      expect(res.body.user).toHaveProperty("name");
      expect(res.body.user).toHaveProperty("location");
      expect(res.body.user).toHaveProperty("profilePhoto");
    });

    it("404s if the user was deleted after issuing the token", async () => {
      const { token, user } = await signupUser();
      await prisma.user.delete({ where: { id: user.id } });

      const res = await request(app)
        .get("/api/users/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });
  });

  describe("PATCH /api/users/me/profile-photo", () => {
    beforeEach(() => {
      // clear mock call history each test
      (s3.uploadBufferToS3 as jest.Mock).mockClear();
      (s3.putBufferSmart as jest.Mock).mockClear();
    });

    it("requires auth", async () => {
      const res = await request(app)
        .patch("/api/users/me/profile-photo")
        .attach("image", Buffer.from("fake"), "avatar.png"); // even with file, should 401

      expect(res.status).toBe(401);
      expect(res.body.message || res.body.error).toMatch(/unauthorized|missing token/i);
    });

    it("returns 400 if no file uploaded", async () => {
      const { token } = await signupUser();
      const res = await request(app)
        .patch("/api/users/me/profile-photo")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/no file uploaded/i);
    });

    it("uploads image to S3 (mocked) and updates profilePhoto", async () => {
      const { token, user } = await signupUser();

      // Use a small PNG buffer; supertest sets MIME from filename
      const res = await request(app)
        .patch("/api/users/me/profile-photo")
        .set("Authorization", `Bearer ${token}`)
        .attach("image", Buffer.from([0x89, 0x50, 0x4e, 0x47]), "avatar.png"); // 'image/png'

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Updated");
      expect(res.body.user).toHaveProperty("profilePhoto");

      expect(s3.putBufferSmart).toHaveBeenCalledTimes(1);
      const call = (s3.putBufferSmart as jest.Mock).mock.calls[0][0];
      expect(call.key).toMatch(new RegExp(`^users/${user.id}/profile/`));
      expect(call.contentType).toMatch(/image\/png/);

      // The URL should be constructed with our mocked cdnUrlFor
      const url: string = res.body.user.profilePhoto;
      expect(url).toMatch(new RegExp(`^https://cdn\\.test/users/${user.id}/profile/`));

      // Verify it persisted
      const fromDb = await prisma.user.findUnique({ where: { id: user.id } });
      expect(fromDb?.profilePhoto || "").toMatch(new RegExp(`^https://cdn\\.test/users/${user.id}/profile/`));
    });

    it("handles unexpected field name with multer error", async () => {
      const { token } = await signupUser();
      const res = await request(app)
        .patch("/api/users/me/profile-photo")
        .set("Authorization", `Bearer ${token}`)
        // field name must be 'image' per router; send 'file' to simulate mistake
        .attach("file", Buffer.from("fake"), "avatar.png");

      // Multer throws 500 for unexpected field, handled by global error handler
      expect(res.status).toBe(500);
      expect(res.body.message).toContain("Unexpected field");
    });

    it("accepts JPEGs as well", async () => {
      const { token, user } = await signupUser();
      const res = await request(app)
        .patch("/api/users/me/profile-photo")
        .set("Authorization", `Bearer ${token}`)
        .attach("image", Buffer.from([0xff, 0xd8, 0xff, 0xdb]), "avatar.jpg"); // 'image/jpeg'

      expect(res.status).toBe(200);
      expect(res.body.user.profilePhoto).toMatch(new RegExp(`^https://cdn\\.test/users/${user.id}/profile/`));

      const call = (s3.putBufferSmart as jest.Mock).mock.calls.pop()[0];
      expect(call.contentType).toMatch(/image\/jpeg/);
      expect(call.key).toMatch(/\.jpg$/);
    });
  });
});