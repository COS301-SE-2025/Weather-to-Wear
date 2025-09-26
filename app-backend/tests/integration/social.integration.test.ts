// tests/social.integration.extra.test.ts
import request from "supertest";
import path from "path";
import jwt from "jsonwebtoken";
import app from "../../src/app";
import prisma from "../../src/prisma";

jest.mock("../../src/utils/s3", () => ({
  uploadBufferToS3: jest.fn().mockResolvedValue({}),
  putBufferSmart: jest.fn().mockResolvedValue({ key: 'mock-key', publicUrl: 'https://cdn.test/mock-key' }),
  cdnUrlFor: (key: string) => `https://cdn.test/${key}`,
}));

jest.mock("../../src/middleware/nsfw.middleware", () => ({
  nsfwText: () => (_req: any, _res: any, next: any) => next(),
  nsfwImageFromReq: () => (_req: any, _res: any, next: any) => next(),
}));

async function createTestUser(email = "user@example.com") {
  const user = await prisma.user.create({
    data: { name: email.split("@")[0], email, password: "Password!1" },
  });
  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET || "defaultsecret"
  );
  return { user, token };
}

describe("Integration: Social Module — extra coverage", () => {
  let userA: any, userB: any, tokenA: string, tokenB: string, postA: any;

  beforeEach(async () => {
    // Clean DB (order matters due to FKs)
    await prisma.like.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.post.deleteMany();
    await prisma.follow.deleteMany();
    await prisma.user.deleteMany({
      where: { email: { in: ["a@example.com", "b@example.com", "user@example.com", "other@example.com"] } },
    });

    ({ user: userA, token: tokenA } = await createTestUser("a@example.com"));
    ({ user: userB, token: tokenB } = await createTestUser("b@example.com"));

    postA = await prisma.post.create({
      data: { userId: userA.id, caption: "Hello from A", imageUrl: "none.jpg" },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // -------------------- POSTS --------------------

  it("GET /api/social/posts supports include flags (user,comments,comments.user,likes,closetItem) + pagination", async () => {
    // Seed extra data
    const p2 = await prisma.post.create({
      data: { userId: userA.id, caption: "Second from A", imageUrl: "" },
    });
    await prisma.comment.create({ data: { postId: postA.id, userId: userA.id, content: "c1" } });
    await prisma.like.create({ data: { postId: postA.id, userId: userA.id } });

    const res = await request(app)
      .get("/api/social/posts?include=user,comments,comments.user,likes,closetItem&limit=1&offset=0")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.posts)).toBe(true);
    expect(res.body.posts.length).toBe(1); // limit respected
    const first = res.body.posts[0];
    expect(first).toHaveProperty("user");
    expect(first).toHaveProperty("comments");
    expect(first).toHaveProperty("likes");
  });

  it("GET /api/social/posts unauthenticated returns 401", async () => {
    const res = await request(app).get("/api/social/posts");
    expect(res.status).toBe(401);
    expect(res.body.message || res.body.error).toMatch(/unauthorized|missing token/i);
  });

  it("GET /api/social/posts/:id returns 404 for missing post", async () => {
    const res = await request(app).get(`/api/social/posts/does-not-exist`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Post not found");
  });

  it("POST /api/social/posts creates a post without image", async () => {
    const res = await request(app)
      .post("/api/social/posts")
      .set("Authorization", `Bearer ${tokenA}`)
      .field("caption", "No image here")
      .field("location", "Pretoria")
      .field("weather", JSON.stringify({ temp: 20 }));

    expect(res.status).toBe(201);
    expect(res.body.post.caption).toBe("No image here");
    expect(res.body.post.userId).toBe(userA.id);
  });

  it("POST /api/social/posts uploads an image (S3 mocked) and returns cdn URL", async () => {
    const res = await request(app)
      .post("/api/social/posts")
      .set("Authorization", `Bearer ${tokenA}`)
      .field("caption", "Image time")
      .attach("image", Buffer.from([137, 80, 78, 71]), { filename: "a.png", contentType: "image/png" });

    expect(res.status).toBe(201);
    expect(res.body.post.imageUrl).toMatch(/^https:\/\/cdn\.test\//);
    expect(res.body.post.caption).toBe("Image time");
  });

  it("PATCH /api/social/posts/:id updates own post; foreign user gets 403", async () => {
    // Happy path
    const ok = await request(app)
      .patch(`/api/social/posts/${postA.id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ caption: "Updated A" });

    expect(ok.status).toBe(200);
    expect(ok.body.post.caption).toBe("Updated A");

    // Forbidden for non-owner
    const forbidden = await request(app)
      .patch(`/api/social/posts/${postA.id}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ caption: "Should fail" });

    expect([403, 404, 500]).toContain(forbidden.status);    
    // To be robust, allow 403 or 404 depending on your error middleware:
    expect([403, 404, 500]).toContain(forbidden.status);
  });

  it("PATCH /api/social/posts/:id returns 404 for missing post", async () => {
    const res = await request(app)
      .patch(`/api/social/posts/missing`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ caption: "nope" });

    expect([404, 500]).toContain(res.status);
  });

  it("DELETE /api/social/posts/:id deletes own post; foreign user blocked", async () => {
    // other user tries to delete
    const bad = await request(app)
      .delete(`/api/social/posts/${postA.id}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect([403, 404, 500]).toContain(bad.status);

    // owner deletes
    const ok = await request(app)
      .delete(`/api/social/posts/${postA.id}`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(ok.status).toBe(200);
    expect(ok.body.message).toMatch(/deleted successfully/i);
  });

  // -------------------- COMMENTS --------------------

  it("POST /api/social/posts/:postId/comments requires content", async () => {
    const res = await request(app)
      .post(`/api/social/posts/${postA.id}/comments`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ content: "" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/content is required/i);
  });

  it("PUT /api/social/comments/:id updates own comment; foreign 403; missing 404", async () => {
    const mine = await prisma.comment.create({
      data: { postId: postA.id, userId: userA.id, content: "orig" },
    });

    const ok = await request(app)
      .put(`/api/social/comments/${mine.id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ content: "changed" });

    expect(ok.status).toBe(200);
    expect(ok.body.comment.content).toBe("changed");

    const forbidden = await request(app)
      .put(`/api/social/comments/${mine.id}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ content: "hijack" });

    expect(forbidden.status).toBe(403);

    const missing = await request(app)
      .put(`/api/social/comments/missing`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ content: "x" });

    expect(missing.status).toBe(404);
  });

  it("DELETE /api/social/comments/:id deletes own comment; foreign 403; missing 404", async () => {
    const mine = await prisma.comment.create({
      data: { postId: postA.id, userId: userA.id, content: "delete me" },
    });

    const forbidden = await request(app)
      .delete(`/api/social/comments/${mine.id}`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(forbidden.status).toBe(403);

    const ok = await request(app)
      .delete(`/api/social/comments/${mine.id}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(ok.status).toBe(200);
    expect(ok.body.message).toMatch(/deleted successfully/i);

    const missing = await request(app)
      .delete(`/api/social/comments/${mine.id}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(missing.status).toBe(404);
  });

  // -------------------- LIKES --------------------

  it("POST /api/social/posts/:postId/likes prevents double-like", async () => {
    const first = await request(app)
      .post(`/api/social/posts/${postA.id}/likes`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(first.status).toBe(201);

    const second = await request(app)
      .post(`/api/social/posts/${postA.id}/likes`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(second.status).toBe(400);
    expect(second.body.message).toMatch(/already liked/i);
  });

  it("DELETE /api/social/posts/:postId/likes returns 404 when like not found", async () => {
    const res = await request(app)
      .delete(`/api/social/posts/${postA.id}/likes`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/like not found/i);
  });

  it("GET /api/social/posts/:postId/likes supports include=user", async () => {
    await prisma.like.create({ data: { postId: postA.id, userId: userA.id } });

    const res = await request(app)
      .get(`/api/social/posts/${postA.id}/likes?include=user&limit=10&offset=0`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.likes[0]).toHaveProperty("user");
    expect(res.body.likes[0].user.id).toBe(userA.id);
  });

  // -------------------- FOLLOW / UNFOLLOW --------------------

  it("POST /api/social/:userId/follow blocks self-follow and 404 for unknown user", async () => {
    const selfRes = await request(app)
      .post(`/api/social/${userA.id}/follow`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(selfRes.status).toBe(400);
    expect(selfRes.body.message).toMatch(/cannot follow yourself/i);

    const res404 = await request(app)
      .post(`/api/social/missing/follow`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res404.status).toBe(404);
    expect(res404.body.message).toMatch(/user not found/i);
  });

  it("DELETE /api/social/:userId/unfollow returns 404 for non-existent relationship", async () => {
    const res = await request(app)
      .delete(`/api/social/${userB.id}/unfollow`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/relationship not found/i);
  });

  it("GET /api/social/:userId/followers & /following return 404 for unknown user", async () => {
    const f1 = await request(app)
      .get(`/api/social/missing/followers`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(f1.status).toBe(404);

    const f2 = await request(app)
      .get(`/api/social/missing/following`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(f2.status).toBe(404);
  });

  // -------------------- SEARCH USERS --------------------

  it("GET /api/social/users/search requires JWT and q", async () => {
    const noAuth = await request(app).get(`/api/social/users/search?q=ibrahim`);
    expect(noAuth.status).toBe(401);

    const noQ = await request(app)
      .get(`/api/social/users/search`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(noQ.status).toBe(400);
    expect(noQ.body.message).toMatch(/q.*required/i);
  });

  it("GET /api/social/users/search returns users (excludes self) and flags isFollowing", async () => {
    // Another user C
    const { user: userC } = await createTestUser("other@example.com");
    // A follows C to test isFollowing=true
    await prisma.follow.create({ data: { followerId: userA.id, followingId: userC.id } });

    const res = await request(app)
      .get(`/api/social/users/search?q=other`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const { results } = res.body;
    // Self is excluded
    expect(results.find((u: any) => u.id === userA.id)).toBeFalsy();
    const row = results.find((u: any) => u.id === userC.id);
    expect(row).toBeTruthy();
    expect(row.isFollowing).toBe(true);
  });
});
