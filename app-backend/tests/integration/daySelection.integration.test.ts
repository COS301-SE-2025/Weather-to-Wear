// tests/integration/daySelection.integration.test.ts
import request from "supertest";
import app from "../../src/app";
import { PrismaClient, Style } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "defaultsecret";

/**
 * FK-safe cleanup (children -> parents).
 */
async function cleanDbFKSafe() {
  // Day selections first
  await prisma.daySelection.deleteMany();
  
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

describe("Integration: Day Selection", () => {
  let userAId: string;
  let userAToken: string;
  let userBId: string;
  let userBToken: string;
  let closetItemA1Id: string;
  let closetItemA2Id: string;
  let outfitAId: string;

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

    // Create an outfit for user A
    const outfit = await prisma.outfit.create({
      data: {
        userId: userAId,
        warmthRating: 5,
        waterproof: false,
        overallStyle: "Casual",
      },
    });
    outfitAId = outfit.id;
  });

  afterAll(async () => {
    await cleanDbFKSafe();
    await prisma.$disconnect();
  });

  describe("POST /api/day-selections", () => {
    const validDaySelection = {
      date: "2024-03-15",
      location: "New York",
      style: "Casual" as Style,
      items: [
        { closetItemId: "", layerCategory: "top", sortOrder: 1 },
        { closetItemId: "", layerCategory: "bottom", sortOrder: 2 }
      ],
      weather: {
        avgTemp: 20,
        minTemp: 15,
        maxTemp: 25,
        willRain: false,
        mainCondition: "sunny"
      }
    };

    it("should create a new day selection", async () => {
      const payload = {
        ...validDaySelection,
        items: [
          { closetItemId: closetItemA1Id, layerCategory: "top", sortOrder: 1 },
          { closetItemId: closetItemA2Id, layerCategory: "bottom", sortOrder: 2 }
        ]
      };

      const res = await request(app)
        .post("/api/day-selections")
        .set("Authorization", `Bearer ${userAToken}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id");
      expect(res.body.userId).toBe(userAId);
      expect(res.body.location).toBe("New York");
      expect(res.body.style).toBe("Casual");
      expect(res.body.weatherAvg).toBe(20);
      expect(res.body.willRain).toBe(false);
    });

    it("should create a day selection with outfit ID", async () => {
      const payload = {
        ...validDaySelection,
        items: [
          { closetItemId: closetItemA1Id, layerCategory: "top", sortOrder: 1 }
        ],
        outfitId: outfitAId
      };

      const res = await request(app)
        .post("/api/day-selections")
        .set("Authorization", `Bearer ${userAToken}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.outfitId).toBe(outfitAId);
    });

    it("should update existing day selection for same date", async () => {
      const payload = {
        ...validDaySelection,
        items: [
          { closetItemId: closetItemA1Id, layerCategory: "top", sortOrder: 1 }
        ]
      };

      // Create first
      await request(app)
        .post("/api/day-selections")
        .set("Authorization", `Bearer ${userAToken}`)
        .send(payload);

      // Update with different location
      const updatedPayload = {
        ...payload,
        location: "Los Angeles",
        weather: {
          ...payload.weather,
          avgTemp: 30
        }
      };

      const res = await request(app)
        .post("/api/day-selections")
        .set("Authorization", `Bearer ${userAToken}`)
        .send(updatedPayload);

      expect(res.status).toBe(200);
      expect(res.body.location).toBe("Los Angeles");
      expect(res.body.weatherAvg).toBe(30);
    });

    it("should return 401 without authentication", async () => {
      const res = await request(app)
        .post("/api/day-selections")
        .send(validDaySelection);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Missing token");
    });

    it("should return 400 for missing required fields", async () => {
      const invalidPayload = {
        location: "New York",
        style: "Casual"
        // Missing date, items, weather
      };

      const res = await request(app)
        .post("/api/day-selections")
        .set("Authorization", `Bearer ${userAToken}`)
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Missing required fields");
    });

    it("should return 400 when items is not an array", async () => {
      const invalidPayload = {
        ...validDaySelection,
        items: "not-an-array"
      };

      const res = await request(app)
        .post("/api/day-selections")
        .set("Authorization", `Bearer ${userAToken}`)
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Missing required fields");
    });

    it("should return 400 when weather is missing", async () => {
      const invalidPayload = {
        date: "2024-03-15",
        items: [{ closetItemId: closetItemA1Id, layerCategory: "top", sortOrder: 1 }]
        // Missing weather
      };

      const res = await request(app)
        .post("/api/day-selections")
        .set("Authorization", `Bearer ${userAToken}`)
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Missing required fields");
    });
  });

  describe("GET /api/day-selections", () => {
    beforeEach(async () => {
      // Create a day selection for user A
      await prisma.daySelection.create({
        data: {
          userId: userAId,
          date: new Date("2024-03-15T00:00:00.000Z"),
          location: "New York",
          style: "Casual",
          items: [
            { closetItemId: closetItemA1Id, layerCategory: "top", sortOrder: 1 }
          ],
          weatherAvg: 20,
          weatherMin: 15,
          weatherMax: 25,
          willRain: false,
          mainCondition: "sunny"
        }
      });
    });

    it("should get day selection by date query parameter", async () => {
      const res = await request(app)
        .get("/api/day-selections")
        .query({ date: "2024-03-15" })
        .set("Authorization", `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id");
      expect(res.body.userId).toBe(userAId);
      expect(res.body.location).toBe("New York");
      expect(res.body.weatherAvg).toBe(20);
    });

    it("should return null for non-existent date", async () => {
      const res = await request(app)
        .get("/api/day-selections")
        .query({ date: "2024-03-16" })
        .set("Authorization", `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });

    it("should return 401 without authentication", async () => {
      const res = await request(app)
        .get("/api/day-selections")
        .query({ date: "2024-03-15" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Missing token");
    });

    it("should return 400 when date query parameter is missing", async () => {
      const res = await request(app)
        .get("/api/day-selections")
        .set("Authorization", `Bearer ${userAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("date query param is required");
    });

    it("should not return other users' day selections", async () => {
      const res = await request(app)
        .get("/api/day-selections")
        .query({ date: "2024-03-15" })
        .set("Authorization", `Bearer ${userBToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });
  });

  describe("GET /api/day-selections/:date", () => {
    beforeEach(async () => {
      // Create a day selection for user A
      await prisma.daySelection.create({
        data: {
          userId: userAId,
          date: new Date("2024-03-15T00:00:00.000Z"),
          location: "New York",
          style: "Casual",
          items: [
            { closetItemId: closetItemA1Id, layerCategory: "top", sortOrder: 1 }
          ],
          weatherAvg: 20,
          weatherMin: 15,
          weatherMax: 25,
          willRain: false,
          mainCondition: "sunny"
        }
      });
    });

    it("should get day selection by date path parameter", async () => {
      const res = await request(app)
        .get("/api/day-selections/2024-03-15")
        .set("Authorization", `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id");
      expect(res.body.userId).toBe(userAId);
      expect(res.body.location).toBe("New York");
    });

    it("should return null for non-existent date", async () => {
      const res = await request(app)
        .get("/api/day-selections/2024-03-16")
        .set("Authorization", `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });

    it("should return 401 without authentication", async () => {
      const res = await request(app)
        .get("/api/day-selections/2024-03-15");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Missing token");
    });
  });

  describe("PATCH /api/day-selections/:id", () => {
    let daySelectionId: string;

    beforeEach(async () => {
      const daySelection = await prisma.daySelection.create({
        data: {
          userId: userAId,
          date: new Date("2024-03-15T00:00:00.000Z"),
          location: "New York",
          style: "Casual",
          items: [
            { closetItemId: closetItemA1Id, layerCategory: "top", sortOrder: 1 }
          ],
          weatherAvg: 20,
          weatherMin: 15,
          weatherMax: 25,
          willRain: false,
          mainCondition: "sunny"
        }
      });
      daySelectionId = daySelection.id;
    });

    it("should update day selection fields", async () => {
      const updateData = {
        location: "Los Angeles",
        style: "Formal",
        weatherAvg: 25
      };

      const res = await request(app)
        .patch(`/api/day-selections/${daySelectionId}`)
        .set("Authorization", `Bearer ${userAToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.location).toBe("Los Angeles");
      expect(res.body.style).toBe("Formal");
      expect(res.body.weatherAvg).toBe(25);
    });

    it("should update with empty body", async () => {
      const res = await request(app)
        .patch(`/api/day-selections/${daySelectionId}`)
        .set("Authorization", `Bearer ${userAToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id");
    });

    it("should return 401 without authentication", async () => {
      const res = await request(app)
        .patch(`/api/day-selections/${daySelectionId}`)
        .send({ location: "Updated" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Missing token");
    });

    it("should return error when trying to update another user's day selection", async () => {
      const res = await request(app)
        .patch(`/api/day-selections/${daySelectionId}`)
        .set("Authorization", `Bearer ${userBToken}`)
        .send({ location: "Hacked" });

      expect(res.status).toBe(500); // Error from service layer
    });

    it("should return error for non-existent day selection", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      
      const res = await request(app)
        .patch(`/api/day-selections/${fakeId}`)
        .set("Authorization", `Bearer ${userAToken}`)
        .send({ location: "Updated" });

      expect(res.status).toBe(500); // Error from service layer
    });
  });

  describe("DELETE /api/day-selections/:date", () => {
    beforeEach(async () => {
      await prisma.daySelection.create({
        data: {
          userId: userAId,
          date: new Date("2024-03-15T00:00:00.000Z"),
          location: "New York",
          style: "Casual",
          items: [
            { closetItemId: closetItemA1Id, layerCategory: "top", sortOrder: 1 }
          ],
          weatherAvg: 20,
          weatherMin: 15,
          weatherMax: 25,
          willRain: false,
          mainCondition: "sunny"
        }
      });
    });

    it("should delete day selection by date", async () => {
      const res = await request(app)
        .delete("/api/day-selections/2024-03-15")
        .set("Authorization", `Bearer ${userAToken}`);

      expect(res.status).toBe(204);

      // Verify it's deleted
      const check = await request(app)
        .get("/api/day-selections/2024-03-15")
        .set("Authorization", `Bearer ${userAToken}`);
      
      expect(check.body).toBeNull();
    });

    it("should handle deletion of non-existent date gracefully", async () => {
      const res = await request(app)
        .delete("/api/day-selections/2024-03-16")
        .set("Authorization", `Bearer ${userAToken}`);

      expect(res.status).toBe(204);
    });

    it("should return 401 without authentication", async () => {
      const res = await request(app)
        .delete("/api/day-selections/2024-03-15");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Missing token");
    });

    it("should not delete other users' day selections", async () => {
      // User B tries to delete User A's day selection
      const res = await request(app)
        .delete("/api/day-selections/2024-03-15")
        .set("Authorization", `Bearer ${userBToken}`);

      expect(res.status).toBe(204); // Service handles this gracefully

      // Verify User A's day selection still exists
      const check = await request(app)
        .get("/api/day-selections/2024-03-15")
        .set("Authorization", `Bearer ${userAToken}`);
      
      expect(check.body).not.toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("should handle invalid date formats gracefully", async () => {
      const payload = {
        date: "invalid-date",
        items: [{ closetItemId: closetItemA1Id, layerCategory: "top", sortOrder: 1 }],
        weather: {
          avgTemp: 20,
          minTemp: 15,
          maxTemp: 25,
          willRain: false,
          mainCondition: "sunny"
        }
      };

      const res = await request(app)
        .post("/api/day-selections")
        .set("Authorization", `Bearer ${userAToken}`)
        .send(payload);

      // Should return error for invalid date
      expect(res.status).toBe(500);
      expect(res.body.message).toContain("Invalid date format");
    });

    it("should handle complex items array", async () => {
      const payload = {
        date: "2024-03-15",
        items: [
          { closetItemId: closetItemA1Id, layerCategory: "top", sortOrder: 1 },
          { closetItemId: closetItemA2Id, layerCategory: "bottom", sortOrder: 2 },
          { closetItemId: closetItemA1Id, layerCategory: "accessory", sortOrder: 3 }
        ],
        weather: {
          avgTemp: 20,
          minTemp: 15,
          maxTemp: 25,
          willRain: true,
          mainCondition: "rainy"
        }
      };

      const res = await request(app)
        .post("/api/day-selections")
        .set("Authorization", `Bearer ${userAToken}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.willRain).toBe(true);
      expect(res.body.mainCondition).toBe("rainy");
    });

    it("should handle null outfitId correctly", async () => {
      const payload = {
        date: "2024-03-15",
        items: [{ closetItemId: closetItemA1Id, layerCategory: "top", sortOrder: 1 }],
        weather: {
          avgTemp: 20,
          minTemp: 15,
          maxTemp: 25,
          willRain: false,
          mainCondition: "sunny"
        },
        outfitId: null
      };

      const res = await request(app)
        .post("/api/day-selections")
        .set("Authorization", `Bearer ${userAToken}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.outfitId).toBeNull();
    });
  });
});
