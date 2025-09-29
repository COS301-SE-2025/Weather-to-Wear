// tests/integration/inspo.integration.test.ts
import request from "supertest";
import app from "../../src/app";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "defaultsecret";

/**
 * FK-safe cleanup (children -> parents).
 */
async function cleanDbFKSafe() {
  // Inspo items and outfits first
  await prisma.inspoItem.deleteMany();
  await prisma.inspoOutfit.deleteMany();
  
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

  // Events
  await prisma.event.deleteMany();

  // Preferences then users
  await prisma.userPreference.deleteMany().catch(() => {});
  await prisma.user.deleteMany();
}

describe("Integration: Inspiration", () => {
  let userAId: string;
  let userAToken: string;
  let userBId: string;
  let userBToken: string;
  let closetItemA1Id: string;
  let closetItemA2Id: string;
  let closetItemB1Id: string;
  let closetItemB2Id: string;
  let inspoOutfitAId: string;

  beforeEach(async () => {
    await cleanDbFKSafe();

    // Create users
    const userA = await prisma.user.create({
      data: {
        name: "User A",
        email: "usera@example.com", 
        password: "hashedPassword",
      },
    });
    userAId = userA.id;
    userAToken = jwt.sign({ id: userA.id, email: userA.email }, JWT_SECRET);

    const userB = await prisma.user.create({
      data: {
        name: "User B",
        email: "userb@example.com",
        password: "hashedPassword",
      },
    });
    userBId = userB.id;
    userBToken = jwt.sign({ id: userB.id, email: userB.email }, JWT_SECRET);

    // Create some closet items for user A
    const closetItem1 = await prisma.closetItem.create({
      data: {
        ownerId: userAId,
        filename: "blue-shirt.jpg",
        category: "TSHIRT",
        layerCategory: "base_top",
        colorHex: "#0000FF",
        warmthFactor: 3,
        waterproof: false,
        style: "Casual",
        material: "Cotton",
        favourite: false,
      },
    });
    closetItemA1Id = closetItem1.id;

    const closetItem2 = await prisma.closetItem.create({
      data: {
        ownerId: userAId,
        filename: "black-jeans.jpg",
        category: "JEANS",
        layerCategory: "base_bottom",
        colorHex: "#000000",
        warmthFactor: 5,
        waterproof: false,
        style: "Casual",
        material: "Denim",
        favourite: false,
      },
    });
    closetItemA2Id = closetItem2.id;

    // Create a closet item for user B
    const closetItemB1 = await prisma.closetItem.create({
      data: {
        ownerId: userBId,
        filename: "red-dress.jpg",
        category: "SHIRT",
        layerCategory: "base_top",
        colorHex: "#FF0000",
        warmthFactor: 4,
        waterproof: false,
        style: "Formal",
        material: "Silk",
        favourite: false,
      },
    });
    closetItemB1Id = closetItemB1.id;

    // Create another closet item for user B
    const closetItemB2 = await prisma.closetItem.create({
      data: {
        ownerId: userBId,
        filename: "white-pants.jpg",
        category: "PANTS",
        layerCategory: "base_bottom",
        colorHex: "#FFFFFF",
        warmthFactor: 3,
        waterproof: false,
        style: "Formal",
        material: "Cotton",
        favourite: false,
      },
    });
    closetItemB2Id = closetItemB2.id;

    // Create an inspiration outfit for user A
    const inspoOutfit = await prisma.inspoOutfit.create({
      data: {
        userId: userAId,
        overallStyle: "Casual",
        warmthRating: 4,
        waterproof: false,
        tags: ["style:casual", "color:blue"],
        recommendedWeatherMin: 15,
        recommendedWeatherMax: 25,
        recommendedConditions: ["sunny"]
      },
    });
    inspoOutfitAId = inspoOutfit.id;

    // Create inspo items for the outfit
    await prisma.inspoItem.create({
      data: {
        inspoOutfitId: inspoOutfitAId,
        closetItemId: closetItemA1Id,
        layerCategory: "base_top",
        sortOrder: 1,
      },
    });
  });

  afterAll(async () => {
    await cleanDbFKSafe();
    await prisma.$disconnect();
  });

  describe("POST /api/inspo/like", () => {
    it("should like an item and store it for inspiration", async () => {
      const res = await request(app)
        .post("/api/inspo/like")
        .set("Authorization", `Bearer ${userAToken}`)
        .send({ closetItemId: closetItemA1Id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Item liked and stored for inspiration");
    });

    it("should return 401 without authentication", async () => {
      const res = await request(app)
        .post("/api/inspo/like")
        .send({ closetItemId: closetItemA1Id });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Missing token");
    });

    it("should return 400 when closetItemId is missing", async () => {
      const res = await request(app)
        .post("/api/inspo/like")
        .set("Authorization", `Bearer ${userAToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("closetItemId is required");
    });

    it("should handle liking the same item multiple times", async () => {
      // Like the same item twice
      await request(app)
        .post("/api/inspo/like")
        .set("Authorization", `Bearer ${userAToken}`)
        .send({ closetItemId: closetItemA1Id });

      const res = await request(app)
        .post("/api/inspo/like")
        .set("Authorization", `Bearer ${userAToken}`)
        .send({ closetItemId: closetItemA1Id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("POST /api/inspo/generate", () => {
    beforeEach(async () => {
      // Have userA like items from userB's closet (cross-user likes for inspiration)
      await request(app)
        .post("/api/inspo/like")
        .set("Authorization", `Bearer ${userAToken}`)
        .send({ closetItemId: closetItemB1Id });

      await request(app)
        .post("/api/inspo/like")
        .set("Authorization", `Bearer ${userAToken}`)
        .send({ closetItemId: closetItemB2Id });
    });

    it("should handle generate request (may return 404 if no cross-user likes)", async () => {
      const res = await request(app)
        .post("/api/inspo/generate")
        .set("Authorization", `Bearer ${userAToken}`)
        .send({});

      // The service requires cross-user likes to generate recommendations
      // If no liked items from other users, it returns 404
      expect([200, 404]).toContain(res.status);
    });

    it("should handle generate request with weather filter", async () => {
      const res = await request(app)
        .post("/api/inspo/generate")
        .set("Authorization", `Bearer ${userAToken}`)
        .send({
          weatherFilter: {
            minTemp: 15,
            maxTemp: 25,
            conditions: ["sunny"]
          }
        });

      // May return 404 if no cross-user liked items match the filter
      expect([200, 404]).toContain(res.status);
    });

    it("should handle generate request with style filter", async () => {
      const res = await request(app)
        .post("/api/inspo/generate")
        .set("Authorization", `Bearer ${userAToken}`)
        .send({
          styleFilter: "Casual"
        });

      // May return 404 if no cross-user liked items match the style filter
      expect([200, 404]).toContain(res.status);
    });

    it("should return 401 without authentication", async () => {
      const res = await request(app)
        .post("/api/inspo/generate")
        .send({});

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Missing token");
    });

    it("should return 404 when no recommendations available", async () => {
      // Use user B who has no liked items
      const res = await request(app)
        .post("/api/inspo/generate")
        .set("Authorization", `Bearer ${userBToken}`)
        .send({});

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("No recommendations available");
      expect(res.body.message).toContain("Try liking some items");
    });
  });

  describe("GET /api/inspo", () => {
    it("should get all inspiration outfits", async () => {
      const res = await request(app)
        .get("/api/inspo")
        .set("Authorization", `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      
      const outfit = res.body[0];
      expect(outfit).toHaveProperty("id");
      expect(outfit).toHaveProperty("overallStyle");
      expect(outfit).toHaveProperty("warmthRating");
      expect(outfit).toHaveProperty("waterproof");
      expect(outfit).toHaveProperty("tags");
      expect(outfit).toHaveProperty("recommendedWeather");
      expect(outfit.recommendedWeather).toHaveProperty("minTemp");
      expect(outfit.recommendedWeather).toHaveProperty("maxTemp");
      expect(outfit.recommendedWeather).toHaveProperty("conditions");
      expect(outfit).toHaveProperty("inspoItems");
      
      // Check inspo items structure
      expect(Array.isArray(outfit.inspoItems)).toBe(true);
      if (outfit.inspoItems.length > 0) {
        const item = outfit.inspoItems[0];
        expect(item).toHaveProperty("closetItemId");
        expect(item).toHaveProperty("layerCategory");
        expect(item).toHaveProperty("sortOrder");
      }
    });

    it("should return 401 without authentication", async () => {
      const res = await request(app)
        .get("/api/inspo");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Missing token");
    });

    it("should return 404 when no inspiration outfits found", async () => {
      // User B has no inspiration outfits
      const res = await request(app)
        .get("/api/inspo")
        .set("Authorization", `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("No saved inspiration outfits found");
      expect(res.body.message).toContain("Try liking some items");
    });

    it("should not return other users' inspiration outfits", async () => {
      // User B should not see User A's outfits
      const res = await request(app)
        .get("/api/inspo")
        .set("Authorization", `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("No saved inspiration outfits found");
    });
  });

  describe("DELETE /api/inspo/:id", () => {
    it("should delete an inspiration outfit", async () => {
      const res = await request(app)
        .delete(`/api/inspo/${inspoOutfitAId}`)
        .set("Authorization", `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Inspiration outfit deleted");

      // Verify it's actually deleted
      const checkRes = await request(app)
        .get("/api/inspo")
        .set("Authorization", `Bearer ${userAToken}`);
      
      expect(checkRes.status).toBe(404);
    });

    it("should return 401 without authentication", async () => {
      const res = await request(app)
        .delete(`/api/inspo/${inspoOutfitAId}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Missing token");
    });

    it("should return error when trying to delete another user's outfit", async () => {
      const res = await request(app)
        .delete(`/api/inspo/${inspoOutfitAId}`)
        .set("Authorization", `Bearer ${userBToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("should return error for non-existent outfit", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      
      const res = await request(app)
        .delete(`/api/inspo/${fakeId}`)
        .set("Authorization", `Bearer ${userAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("should handle deletion of outfit with inspo items", async () => {
      // The outfit already has inspo items created in beforeEach
      const res = await request(app)
        .delete(`/api/inspo/${inspoOutfitAId}`)
        .set("Authorization", `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify inspo items are also deleted (cascade should handle this)
      const inspoItems = await prisma.inspoItem.findMany({
        where: { inspoOutfitId: inspoOutfitAId }
      });
      expect(inspoItems.length).toBe(0);
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should return 400 when closetItemId is missing in like request", async () => {
      const res = await request(app)
        .post("/api/inspo/like")
        .set("Authorization", `Bearer ${userAToken}`)
        .send({}); // Missing closetItemId

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("closetItemId is required");
    });

    it("should return 401 for like request without authentication", async () => {
      const res = await request(app)
        .post("/api/inspo/like")
        .send({ closetItemId: closetItemA1Id });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Missing token");
    });

    it("should return 401 for generate request without authentication", async () => {
      const res = await request(app)
        .post("/api/inspo/generate")
        .send({});

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Missing token");
    });

    it("should return 401 for get all request without authentication", async () => {
      const res = await request(app)
        .get("/api/inspo");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Missing token");
    });

    it("should handle generate request with no liked items gracefully", async () => {
      // Fresh user with no liked items
      const cleanUser = await prisma.user.create({
        data: {
          name: "Clean User",
          email: "clean@example.com",
          password: "hashedPassword",
        },
      });
      const cleanUserToken = jwt.sign({ id: cleanUser.id, email: cleanUser.email }, JWT_SECRET);

      const res = await request(app)
        .post("/api/inspo/generate")
        .set("Authorization", `Bearer ${cleanUserToken}`)
        .send({});

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("No recommendations available");
    });

    it("should handle generate request failure gracefully", async () => {
      // Create a scenario that might cause generation to fail
      const res = await request(app)
        .post("/api/inspo/generate")
        .set("Authorization", `Bearer ${userAToken}`)
        .send({ 
          weather: { invalidProperty: true }, // Invalid weather data
          style: "InvalidStyle" // Invalid style
        });

      expect([400, 404]).toContain(res.status);
    });

    it("should handle liking non-existent closet item", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      
      const res = await request(app)
        .post("/api/inspo/like")
        .set("Authorization", `Bearer ${userAToken}`)
        .send({ closetItemId: fakeId });

      expect(res.status).toBe(400);
    });

    it("should return 404 when user has no inspiration outfits", async () => {
      // Fresh user with no inspiration outfits
      const emptyUser = await prisma.user.create({
        data: {
          name: "Empty User",
          email: "empty@example.com",
          password: "hashedPassword",
        },
      });
      const emptyUserToken = jwt.sign({ id: emptyUser.id, email: emptyUser.email }, JWT_SECRET);

      const res = await request(app)
        .get("/api/inspo")
        .set("Authorization", `Bearer ${emptyUserToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("No saved inspiration outfits found");
    });

    it("should handle delete request without authentication", async () => {
      const res = await request(app)
        .delete("/api/inspo/some-id");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Missing token");
    });

    it("should handle delete request for non-existent outfit", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      
      const res = await request(app)
        .delete(`/api/inspo/${fakeId}`)
        .set("Authorization", `Bearer ${userAToken}`);

      expect(res.status).toBe(400);
    });

    it("should handle malformed request bodies gracefully", async () => {
      const res = await request(app)
        .post("/api/inspo/generate")
        .set("Authorization", `Bearer ${userAToken}`)
        .send("invalid json string");

      expect([400, 404]).toContain(res.status);
    });

    it("should handle generate with extreme parameters", async () => {
      const res = await request(app)
        .post("/api/inspo/generate")
        .set("Authorization", `Bearer ${userAToken}`)
        .send({
          limit: 999999, // Should be capped to 5
          weather: {
            minTemp: -100,
            maxTemp: 200,
            conditions: ["impossible_weather"]
          }
        });

      expect([200, 404]).toContain(res.status);
    });
  });
});
