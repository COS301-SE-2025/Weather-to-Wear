import request from "supertest";
import app from "../../src/app";
import prisma from "../../src/prisma";
import jwt from "jsonwebtoken";
import { OverallStyle, LayerCategory, Category, Style } from "@prisma/client";

async function createTestUser() {
  const user = await prisma.user.create({
    data: {
      name: "Outfit User",
      email: "outfituser@example.com",
      password: "Password!1",
    },
  });
  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || "defaultsecret");
  return { user, token };
}

async function createClosetItem(userId: string) {
  return await prisma.closetItem.create({
    data: {
      filename: "test_img.jpg",
      category: "TSHIRT",
      layerCategory: "base_top",
      ownerId: userId,
      colorHex: "#FF0000",
      warmthFactor: 5,
      waterproof: false,
      style: "Casual",
      material: "Cotton",
    }
  });
}

describe("Integration: Outfit Module", () => {
  let userId: string;
  let token: string;
  let closetItem: any;

  beforeEach(async () => {
    await prisma.closetItem.deleteMany();
    await prisma.like.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.post.deleteMany();
    await prisma.follow.deleteMany();
    await prisma.user.deleteMany();

    const { user, token: t } = await createTestUser();
    userId = user.id;
    token = t;
    closetItem = await createClosetItem(userId);
  });

  afterAll(async () => {
    await prisma.closetItem.deleteMany();
    await prisma.like.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.post.deleteMany();
    await prisma.follow.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it("POST /api/outfits creates an outfit", async () => {
    const data = {
      outfitItems: [
        {
          closetItemId: closetItem.id,
          layerCategory: "base_top",
          sortOrder: 1
        }
      ],
      warmthRating: 5,
      waterproof: false,
      overallStyle: "Casual",
      weatherSummary: JSON.stringify({ temp: 20, rain: false }),
      userRating: 4,
    };
    const res = await request(app)
      .post("/api/outfits")
      .set("Authorization", `Bearer ${token}`)
      .send(data);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.outfitItems.length).toBe(1);
    expect(res.body.outfitItems[0].closetItemId).toBe(closetItem.id);
  });

  it("GET /api/outfits gets all outfits for user", async () => {
    await prisma.outfit.create({
      data: {
        userId,
        warmthRating: 5,
        waterproof: false,
        overallStyle: "Casual",
        outfitItems: {
          create: [
            {
              closetItemId: closetItem.id,
              layerCategory: "base_top",
              sortOrder: 1,
            }
          ]
        }
      }
    });
    const res = await request(app)
      .get("/api/outfits")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty("id");
    expect(res.body[0].outfitItems.length).toBe(1);
  });

  it("GET /api/outfits/:id gets single outfit", async () => {
    const outfit = await prisma.outfit.create({
      data: {
        userId,
        warmthRating: 5,
        waterproof: false,
        overallStyle: "Casual",
        outfitItems: {
          create: [
            {
              closetItemId: closetItem.id,
              layerCategory: "base_top",
              sortOrder: 1,
            }
          ]
        }
      }
    });
    const res = await request(app)
      .get(`/api/outfits/${outfit.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(outfit.id);
  });

  it("PUT /api/outfits/:id updates outfit rating", async () => {
    const outfit = await prisma.outfit.create({
      data: {
        userId,
        warmthRating: 5,
        waterproof: false,
        overallStyle: "Casual",
        outfitItems: {
          create: [
            {
              closetItemId: closetItem.id,
              layerCategory: "base_top",
              sortOrder: 1,
            }
          ]
        }
      }
    });

    const res = await request(app)
      .put(`/api/outfits/${outfit.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ userRating: 2 });

    expect(res.status).toBe(200);
    expect(res.body.userRating).toBe(2);
  });

  it("DELETE /api/outfits/:id deletes an outfit", async () => {
    const outfit = await prisma.outfit.create({
      data: {
        userId,
        warmthRating: 5,
        waterproof: false,
        overallStyle: "Casual",
        outfitItems: {
          create: [
            {
              closetItemId: closetItem.id,
              layerCategory: "base_top",
              sortOrder: 1,
            }
          ]
        }
      }
    });

    const res = await request(app)
      .delete(`/api/outfits/${outfit.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);

    const dbOutfit = await prisma.outfit.findUnique({ where: { id: outfit.id } });
    expect(dbOutfit).toBeNull();
  });

  it("GET /api/outfits/:id/items returns outfit items", async () => {
    const outfit = await prisma.outfit.create({
      data: {
        userId,
        warmthRating: 5,
        waterproof: false,
        overallStyle: "Casual",
        outfitItems: {
          create: [
            {
              closetItemId: closetItem.id,
              layerCategory: "base_top",
              sortOrder: 1,
            }
          ]
        }
      }
    });
    const res = await request(app)
      .get(`/api/outfits/${outfit.id}/items`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].closetItemId).toBe(closetItem.id);
  });

  it("POST /api/outfits/:id/items adds item to outfit", async () => {
    const outfit = await prisma.outfit.create({
      data: {
        userId,
        warmthRating: 5,
        waterproof: false,
        overallStyle: "Casual",
      }
    });
    const secondItem = await prisma.closetItem.create({
      data: {
        filename: "another_img.jpg",
        category: "TSHIRT",
        layerCategory: "base_top",
        ownerId: userId,
        colorHex: "#00FF00",
        warmthFactor: 4,
        waterproof: false,
        style: "Casual",
        material: "Cotton",
      }
    });

    const res = await request(app)
      .post(`/api/outfits/${outfit.id}/items`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        closetItemId: secondItem.id,
        layerCategory: "base_top",
        sortOrder: 2
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.closetItemId).toBe(secondItem.id);
  });

  it("DELETE /api/outfits/:id/items/:itemId removes item from outfit", async () => {
    const outfit = await prisma.outfit.create({
      data: {
        userId,
        warmthRating: 5,
        waterproof: false,
        overallStyle: "Casual",
        outfitItems: {
          create: [
            {
              closetItemId: closetItem.id,
              layerCategory: "base_top",
              sortOrder: 1,
            }
          ]
        }
      },
      include: { outfitItems: true }
    });

    const itemId = outfit.outfitItems[0].id;

    const res = await request(app)
      .delete(`/api/outfits/${outfit.id}/items/${itemId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);

    const found = await prisma.outfitItem.findUnique({ where: { id: itemId } });
    expect(found).toBeNull();
  });
});
