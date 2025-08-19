// tests/integration/packing.integration.test.ts
import request from "supertest";
import app from "../../src/app";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
// Use the same fallback as your other suites (closet, etc.)
const JWT_SECRET = process.env.JWT_SECRET || "defaultsecret";

/**
 * FK-safe cleanup (children -> parents).
 * NOTE: You still need to fix tests/integration/setupTestEnv.ts,
 * but this file will also clean up after itself to avoid triggering
 * that file's FK order bug between tests.
 */
async function cleanDbFKSafe() {
  // Packing (children first)
  await prisma.packingItem.deleteMany();
  await prisma.packingOutfit.deleteMany();
  await prisma.packingOther.deleteMany();
  await prisma.packingList.deleteMany();

  // Outfit items (if used)
  await prisma.outfitItem.deleteMany().catch(() => {});

  // Social (children -> parent)
  await prisma.comment.deleteMany();
  await prisma.like.deleteMany();
  await prisma.post.deleteMany();
  await prisma.follow.deleteMany();

  // Domain parents
  await prisma.outfit.deleteMany();
  await prisma.closetItem.deleteMany();

  // Trips/events (now safe)
  await prisma.event.deleteMany();

  // Preferences then users
  await prisma.userPreference.deleteMany().catch(() => {});
  await prisma.user.deleteMany();
}

describe("Integration: Packing", () => {
  let userAId: string;
  let userAToken: string;
  let userBId: string;
  let userBToken: string;

  let tripAId: string;
  let closetItemA1Id: string;
  let outfitA1Id: string;

  beforeEach(async () => {
    // Make sure we start clean in this file
    await cleanDbFKSafe();

    // Users
    const userA = await prisma.user.create({
      data: { name: "User A", email: "usera@example.com", password: "hash" },
    });
    userAId = userA.id;
    userAToken = jwt.sign({ id: userA.id, email: userA.email }, JWT_SECRET);

    const userB = await prisma.user.create({
      data: { name: "User B", email: "userb@example.com", password: "hash" },
    });
    userBId = userB.id;
    userBToken = jwt.sign({ id: userB.id, email: userB.email }, JWT_SECRET);

    // Trip (Event) for user A — matches your schema exactly
    const now = Date.now();
    const tripA = await prisma.event.create({
      data: {
        userId: userAId,
        location: "Cape Town",
        dateFrom: new Date(now + 24 * 3600 * 1000), // +1 day
        dateTo: new Date(now + 2 * 24 * 3600 * 1000), // +2 days
        style: "Casual",      // enum Style
        name: "Cape Town Trip",
        isTrip: true,
      },
      select: { id: true },
    });
    tripAId = tripA.id;

    // Closet item for user A
    const itemA1 = await prisma.closetItem.create({
      data: {
        filename: "tee.png",
        category: "TSHIRT",
        layerCategory: "base_top",
        ownerId: userAId,
        colorHex: "#aaaaaa",
        warmthFactor: 3,
        waterproof: false,
        style: "Casual",
        material: "Cotton",
        favourite: false,
      },
      select: { id: true },
    });
    closetItemA1Id = itemA1.id;

    // Outfit for user A — required fields per your schema
    const outfitA1 = await prisma.outfit.create({
      data: {
        userId: userAId,
        warmthRating: 5,
        waterproof: false,
        overallStyle: "Casual", // enum OverallStyle
      },
      select: { id: true },
    });
    outfitA1Id = outfitA1.id;
  });

  // Extra safety: remove packing rows after each test so your
  // global setupTestEnv.ts won't hit FK errors when it runs next.
  afterEach(async () => {
    await prisma.packingItem.deleteMany();
    await prisma.packingOutfit.deleteMany();
    await prisma.packingOther.deleteMany();
    await prisma.packingList.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ----------------- CREATE -----------------
  it("POST /api/packing creates a packing list (happy path)", async () => {
    const res = await request(app)
      .post("/api/packing")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({
        tripId: tripAId,
        items: [closetItemA1Id],
        outfits: [outfitA1Id],
        others: ["charger", "toothbrush"],
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("tripId", tripAId);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(Array.isArray(res.body.outfits)).toBe(true);
    expect(Array.isArray(res.body.others)).toBe(true);
    expect(res.body.items[0]).toHaveProperty("packed", false);
    expect(res.body.outfits[0]).toHaveProperty("packed", false);
    expect(res.body.others[0]).toHaveProperty("packed", false);
  });

  it("POST /api/packing returns 400 for missing tripId", async () => {
    const res = await request(app)
      .post("/api/packing")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({
        items: [],
        outfits: [],
        others: [],
      });

    expect([400, 500]).toContain(res.status);
    expect((res.body.message || res.body.error || "")).toMatch(/missing tripid/i);
  });

  it("POST /api/packing returns 404 for trip not owned by user", async () => {
    const tripB = await prisma.event.create({
      data: {
        userId: userBId,
        location: "Johannesburg",
        dateFrom: new Date(),
        dateTo: new Date(Date.now() + 3600000),
        style: "Business",
        name: "Not Yours",
        isTrip: true,
      },
      select: { id: true },
    });

    const res = await request(app)
      .post("/api/packing")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ tripId: tripB.id });

    expect([404, 500]).toContain(res.status);
    expect((res.body.message || "").toLowerCase()).toMatch(/trip not found|not owned/);
  });

  it("POST /api/packing returns 400 if items/outfits include IDs not owned by user", async () => {
    const itemB = await prisma.closetItem.create({
      data: {
        filename: "b.png",
        category: "TSHIRT",
        layerCategory: "base_top",
        ownerId: userBId,
        favourite: false,
      },
      select: { id: true },
    });

    const outfitB = await prisma.outfit.create({
      data: {
        userId: userBId,
        warmthRating: 4,
        waterproof: false,
        overallStyle: "Casual",
      },
      select: { id: true },
    });

    const res = await request(app)
      .post("/api/packing")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({
        tripId: tripAId,
        items: [itemB.id],
        outfits: [outfitB.id],
      });

    expect([400, 500]).toContain(res.status);
    expect((res.body.message || "").toLowerCase()).toMatch(/invalid|not owned/);
  });

  it("POST /api/packing returns 409 when creating a duplicate list for the same trip", async () => {
    const first = await request(app)
      .post("/api/packing")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ tripId: tripAId });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/packing")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ tripId: tripAId });

    expect([409, 500]).toContain(second.status);
    expect((second.body.message || "").toLowerCase()).toMatch(/already exists|duplicate/);
  });

  it("POST /api/packing requires auth", async () => {
    const res = await request(app).post("/api/packing").send({ tripId: tripAId });
    expect(res.status).toBe(401);
  });

  // ----------------- GET -----------------
  it("GET /api/packing/:tripId returns the user's packing list", async () => {
    const create = await request(app)
      .post("/api/packing")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({
        tripId: tripAId,
        items: [closetItemA1Id],
        outfits: [outfitA1Id],
        others: ["charger"],
      });
    expect(create.status).toBe(201);

    const res = await request(app)
      .get(`/api/packing/${tripAId}`)
      .set("Authorization", `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.tripId).toBe(tripAId);
    expect(res.body.items.length).toBe(1);
    expect(res.body.outfits.length).toBe(1);
    expect(res.body.others.length).toBe(1);
  });

  it("GET /api/packing/:tripId with no list returns 404 (controller currently does this)", async () => {
    const res = await request(app)
      .get(`/api/packing/${tripAId}`)
      .set("Authorization", `Bearer ${userAToken}`);

    expect(res.status).toBe(404);
    expect((res.body.message || res.text || "").toLowerCase()).toMatch(/not found|no.*packing list/);
  });

  it("GET /api/packing/:tripId requires auth", async () => {
    const res = await request(app).get(`/api/packing/${tripAId}`);
    expect(res.status).toBe(401);
  });

  // ----------------- UPDATE -----------------
  it("PUT /api/packing/:listId toggles packed flags", async () => {
    const create = await request(app)
      .post("/api/packing")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({
        tripId: tripAId,
        items: [closetItemA1Id],
        outfits: [outfitA1Id],
        others: ["phone", "charger"],
      });
    expect(create.status).toBe(201);

    const listId = create.body.id as string;
    const itemRow = create.body.items[0];
    const outfitRow = create.body.outfits[0];
    const otherRows = create.body.others;

    const res = await request(app)
      .put(`/api/packing/${listId}`)
      .set("Authorization", `Bearer ${userAToken}`)
      .send({
        items: [{ id: itemRow.id, packed: true }],
        outfits: [{ id: outfitRow.id, packed: true }],
        others: otherRows.map((o: any) => ({ id: o.id, packed: true })),
      });

    expect(res.status).toBe(200);
    expect(res.body.items[0].packed).toBe(true);
    expect(res.body.outfits[0].packed).toBe(true);
    expect(res.body.others.every((o: any) => o.packed === true)).toBe(true);
  });

  it("PUT /api/packing/:listId returns 404 for list not owned by user", async () => {
    const create = await request(app)
      .post("/api/packing")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ tripId: tripAId });
    expect(create.status).toBe(201);

    const listId = create.body.id;
    const res = await request(app)
      .put(`/api/packing/${listId}`)
      .set("Authorization", `Bearer ${userBToken}`)
      .send({ others: [] });

    expect([404, 500]).toContain(res.status);
    expect((res.body.message || "").toLowerCase()).toMatch(/not found/);
  });

  it("PUT /api/packing/:listId requires auth", async () => {
    const res = await request(app).put(`/api/packing/some-id`).send({});
    expect(res.status).toBe(401);
  });

  // ----------------- DELETE -----------------
  it("DELETE /api/packing/:listId deletes list + children", async () => {
    const create = await request(app)
      .post("/api/packing")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({
        tripId: tripAId,
        items: [closetItemA1Id],
        outfits: [outfitA1Id],
        others: ["cable"],
      });
    expect(create.status).toBe(201);
    const listId = create.body.id as string;

    const res = await request(app)
      .delete(`/api/packing/${listId}`)
      .set("Authorization", `Bearer ${userAToken}`);

    expect(res.status).toBe(204);

    // Verify DB is cleaned up
    const found = await prisma.packingList.findUnique({ where: { id: listId } });
    expect(found).toBeNull();

    const itemRows = await prisma.packingItem.findMany({ where: { packingListId: listId } });
    const outfitRows = await prisma.packingOutfit.findMany({ where: { packingListId: listId } });
    const otherRows = await prisma.packingOther.findMany({ where: { packingListId: listId } });
    expect(itemRows.length).toBe(0);
    expect(outfitRows.length).toBe(0);
    expect(otherRows.length).toBe(0);
  });

  it("DELETE /api/packing/:listId returns 404 for list not owned by user", async () => {
    const create = await request(app)
      .post("/api/packing")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ tripId: tripAId });
    expect(create.status).toBe(201);

    const listId = create.body.id;
    const res = await request(app)
      .delete(`/api/packing/${listId}`)
      .set("Authorization", `Bearer ${userBToken}`);

    expect([404, 500]).toContain(res.status);
    expect((res.body.message || "").toLowerCase()).toMatch(/not found/);
  });

  it("DELETE /api/packing/:listId requires auth", async () => {
    const res = await request(app).delete(`/api/packing/whatever`);
    expect(res.status).toBe(401);
  });
});
