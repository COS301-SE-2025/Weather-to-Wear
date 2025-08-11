import request from "supertest";
import app from "../../src/app";
import prisma from "../../src/prisma";
import jwt from "jsonwebtoken";

// Helper to create users and return their JWT
async function createTestUser(email = "socialuser@example.com") {
  const user = await prisma.user.create({
    data: {
      name: "Social User",
      email,
      password: "Password!1",
    },
  });
  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || "defaultsecret");
  return { user, token };
}

describe("Integration: Social Module", () => {
  let userA: any, userB: any, tokenA: string, tokenB: string, postA: any;

  beforeEach(async () => {
    // Clean up everything
    await prisma.like.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.post.deleteMany();
    await prisma.follow.deleteMany();
    await prisma.user.deleteMany({ where: { email: { in: ["socialuser@example.com", "otheruser@example.com"] } } });

    // Create users and tokens
    ({ user: userA, token: tokenA } = await createTestUser("socialuser@example.com"));
    ({ user: userB, token: tokenB } = await createTestUser("otheruser@example.com"));

    // Create a post by userA
    postA = await prisma.post.create({
      data: {
        userId: userA.id,
        caption: "Hello from A",
        imageUrl: "none.jpg"
      }
    });
  });

  beforeEach(async () => {
    await prisma.like.deleteMany();    
    await prisma.comment.deleteMany(); 
    await prisma.post.deleteMany();    
    await prisma.follow.deleteMany();  
    await prisma.user.deleteMany({ where: { email: { in: ["socialuser@example.com", "otheruser@example.com"] } } }); 

    ({ user: userA, token: tokenA } = await createTestUser("socialuser@example.com"));
    ({ user: userB, token: tokenB } = await createTestUser("otheruser@example.com"));

    postA = await prisma.post.create({
      data: {
        userId: userA.id,
        caption: "Hello from A",
        imageUrl: "none.jpg"
      }
    });
  });

  it("GET /api/social/posts returns only posts from self and friends", async () => {
    // By default, userA has only their own post
    const res = await request(app)
      .get("/api/social/posts")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.posts)).toBe(true);
    expect(res.body.posts.some((p: any) => p.userId === userA.id)).toBe(true);
  });

  it("POST /api/social/:userId/follow allows following, then A can see B's posts", async () => {
    // User B creates a post
    await prisma.post.create({
      data: { userId: userB.id, caption: "Post by B", imageUrl: "" }
    });

    // A follows B
    const followRes = await request(app)
      .post(`/api/social/${userB.id}/follow`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(followRes.status).toBe(200);

    // Now A can see B's posts in feed
    const feedRes = await request(app)
      .get("/api/social/posts")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(feedRes.body.posts.some((p: any) => p.userId === userB.id)).toBe(true);
  });

  it("POST /api/social/posts/:postId/comments creates a comment", async () => {
    const res = await request(app)
      .post(`/api/social/posts/${postA.id}/comments`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ content: "Nice!" });

    expect(res.status).toBe(201);
    expect(res.body.comment.content).toBe("Nice!");
    expect(res.body.comment.userId).toBe(userA.id);
  });

  it("GET /api/social/posts/:postId/comments gets comments for a post", async () => {
    // Add comment
    await prisma.comment.create({
      data: { postId: postA.id, userId: userA.id, content: "Comment 1" }
    });

    const res = await request(app)
      .get(`/api/social/posts/${postA.id}/comments`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.comments)).toBe(true);
    expect(res.body.comments[0].content).toBe("Comment 1");
  });

  it("POST /api/social/posts/:postId/likes likes a post", async () => {
    const res = await request(app)
      .post(`/api/social/posts/${postA.id}/likes`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(201);
    expect(res.body.like.userId).toBe(userA.id);
  });

  it("DELETE /api/social/posts/:postId/likes unlikes a post", async () => {
    // First like
    await prisma.like.create({ data: { postId: postA.id, userId: userA.id } });
    const res = await request(app)
      .delete(`/api/social/posts/${postA.id}/likes`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Post unliked successfully");
  });

  it("GET /api/social/posts/:postId/likes gets likes for a post", async () => {
    await prisma.like.create({ data: { postId: postA.id, userId: userA.id } });
    const res = await request(app)
      .get(`/api/social/posts/${postA.id}/likes`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.likes)).toBe(true);
    expect(res.body.likes[0].userId).toBe(userA.id);
  });

  it("POST /api/social/:userId/unfollow unfollows a user", async () => {
    // First, follow
    await prisma.follow.create({ data: { followerId: userA.id, followingId: userB.id } });
    const res = await request(app)
      .delete(`/api/social/${userB.id}/unfollow`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "User unfollowed successfully");
  });

  it("GET /api/social/:userId/followers gets followers", async () => {
    await prisma.follow.create({ data: { followerId: userA.id, followingId: userB.id } });
    const res = await request(app)
      .get(`/api/social/${userB.id}/followers`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.followers)).toBe(true);
    expect(res.body.followers[0].follower.id).toBe(userA.id);
  });

  it("GET /api/social/:userId/following gets following", async () => {
    await prisma.follow.create({ data: { followerId: userA.id, followingId: userB.id } });
    const res = await request(app)
      .get(`/api/social/${userA.id}/following`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.following)).toBe(true);
    expect(res.body.following[0].following.id).toBe(userB.id);
  });
});
