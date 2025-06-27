import request from "supertest";
import app from "../../src/app";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import prisma from "../../src/prisma";

// const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "defaultsecret";

describe("Integration: User Preferences", () => {
    let token: string;
    let userId: string;

    beforeEach(async () => {
        // Clean up everything before each test for isolation
        await prisma.userPreference.deleteMany();
        await prisma.user.deleteMany();

        // Now create a user
        const user = await prisma.user.create({
            data: {
                name: "Pref User",
                email: "prefuser@example.com",
                password: "hashedpass" // Use a hashed password if needed
            }
        });
        userId = user.id;
        token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
    });

    afterAll(async () => {
        await prisma.userPreference.deleteMany();
        await prisma.user.deleteMany();
        await prisma.$disconnect();
    });

    it("GET /api/preferences should 404 when no preferences", async () => {
        const res = await request(app)
            .get("/api/preferences")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/not found/i);
    });

    it("PUT /api/preferences creates new preferences", async () => {
        const pref = {
            style: "Casual",
            preferredColours: ["#ff0000", "#00ff00"],
            learningWeight: 0.9,
        };
        const res = await request(app)
            .put("/api/preferences")
            .set("Authorization", `Bearer ${token}`)
            .send(pref);
        expect(res.status).toBe(200);
    });

    it("GET /api/preferences returns preferences", async () => {
        // Set up: create preferences for this user
        await prisma.userPreference.create({
            data: {
                userId,
                style: "Casual",
                preferredColours: ["#ff0000", "#00ff00"],
                learningWeight: 0.9,
            },
        });
        const res = await request(app)
            .get("/api/preferences")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.style).toBe("Casual");
        expect(res.body.preferredColours.length).toBe(2);
    });

    it("PUT /api/preferences with no/invalid token should 401", async () => {
        const res = await request(app)
            .put("/api/preferences")
            .send({
                style: "Business",
                preferredColours: ["#FF0000"],
                learningWeight: 0.8,
            });
        expect(res.status).toBe(401);
    });

    it("PUT /api/preferences with too many colours returns 400", async () => {
        const res = await request(app)
            .put("/api/preferences")
            .set("Authorization", `Bearer ${token}`)
            .send({
                style: "Athletic",
                preferredColours: [
                    "#1", "#2", "#3", "#4", "#5", "#6"
                ],
                learningWeight: 0.8,
            });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/between 1 and 5/);
    });
});
