import request from "supertest";
import app from "../../src/app";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import prisma from "../../src/prisma";

// --- MOCK WEATHER SERVICE ---
jest.mock("../../src/modules/weather/weather.service", () => ({
    getWeatherByLocation: jest.fn().mockResolvedValue({ summary: { temperature: 22, condition: "Sunny" } }),
    getWeatherByDay: jest.fn().mockResolvedValue({ summary: { temperature: 23, condition: "Partly Cloudy" } }),
}));

// const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "defaultsecret";

describe("Integration: Events Module", () => {
    let userId: string;
    let token: string;

    beforeEach(async () => {
        // Clean database before each test
        await prisma.event.deleteMany();
        await prisma.user.deleteMany({ where: { email: "eventuser@example.com" } });

        // Add user
        const user = await prisma.user.create({
            data: {
                name: "Event User",
                email: "eventuser@example.com",
                password: "Password!1", 
            },
        });
        userId = user.id;
        token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
    });

    afterAll(async () => {
        await prisma.event.deleteMany();
        await prisma.user.deleteMany({ where: { email: "eventuser@example.com" } });
        await prisma.$disconnect();
    });

    it("POST /api/events/createEvent should create an event", async () => {
        const today = new Date();
        today.setDate(today.getDate() + 1);
        const tomorrow = today.toISOString().slice(0, 10);

        const eventData = {
            name: "Party",
            location: "Pretoria",
            dateFrom: tomorrow,
            dateTo: tomorrow,
            style: "Party",
        };

        const res = await request(app)
            .post("/api/events/createEvent")
            .set("Authorization", `Bearer ${token}`)
            .send(eventData);

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty("id");
        expect(res.body.name).toBe("Party");
        expect(res.body.location).toBe("Pretoria");
        expect(res.body.style).toBe("Party");
        expect(res.body.weather).toContain("Partly Cloudy");
    });

    it("GET /api/events/getEvents should list user events", async () => {
        // Create event directly in DB
        const event = await prisma.event.create({
            data: {
                userId,
                name: "Test Event",
                location: "Pretoria",
                weather: JSON.stringify([{ date: "2025-01-01", summary: { temperature: 21, condition: "Clear" } }]),
                dateFrom: new Date(),
                dateTo: new Date(),
                style: "Casual",
            },
        });

        const res = await request(app)
            .get("/api/events/getEvents")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.some((ev: any) => ev.id === event.id)).toBe(true);
    });

    it("GET /api/events/getEvent should return single event", async () => {
        const dbEvent = await prisma.event.create({
            data: {
                userId,
                name: "Test Event",
                location: "Cape Town",
                weather: JSON.stringify([{ date: "2025-01-01", summary: { temperature: 21, condition: "Clear" } }]),
                dateFrom: new Date(),
                dateTo: new Date(),
                style: "Business",
            },
        });

        const res = await request(app)
            .get("/api/events/getEvent?id=" + dbEvent.id)
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(dbEvent.id);
        expect(res.body.location).toBe("Cape Town");
        expect(res.body.style).toBe("Business");
    });

    it("PUT /api/events/updateEvent should update event", async () => {
        const dbEvent = await prisma.event.create({
            data: {
                userId,
                name: "Old Event",
                location: "Joburg",
                weather: JSON.stringify([{ date: "2025-01-01", summary: { temperature: 21, condition: "Clear" } }]),
                dateFrom: new Date(),
                dateTo: new Date(),
                style: "Outdoor",
            },
        });

        const update = {
            id: dbEvent.id,
            name: "New Event Name",
            location: "Durban",
            style: "Athletic",
        };

        const res = await request(app)
            .put("/api/events/updateEvent")
            .set("Authorization", `Bearer ${token}`)
            .send(update);

        expect(res.status).toBe(200);
        expect(res.body.name).toBe("New Event Name");
        expect(res.body.location).toBe("Durban");
        expect(res.body.style).toBe("Athletic");
    });

    it("DELETE /api/events/deleteEvent should delete event", async () => {
        const dbEvent = await prisma.event.create({
            data: {
                userId,
                name: "Event to Delete",
                location: "Bloem",
                weather: JSON.stringify([{ date: "2025-01-01", summary: { temperature: 21, condition: "Clear" } }]),
                dateFrom: new Date(),
                dateTo: new Date(),
                style: "Formal",
            },
        });

        const res = await request(app)
            .delete("/api/events/deleteEvent")
            .set("Authorization", `Bearer ${token}`)
            .send({ id: dbEvent.id });

        expect(res.status).toBe(204);

        // Verify it's gone
        const found = await prisma.event.findUnique({ where: { id: dbEvent.id } });
        expect(found).toBeNull();
    });

    it("POST /api/events/createEvent should reject missing fields", async () => {
        const res = await request(app)
            .post("/api/events/createEvent")
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "Incomplete" });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/missing required/i);
    });

    it("GET /api/events/getEvents should require auth", async () => {
        const res = await request(app)
            .get("/api/events/getEvents");

        console.log("EVENT AUTH FAIL RESPONSE:", res.body, res.text);

        expect(res.status).toBe(401);
        expect(res.body.error || res.body.message || "").toMatch(/unauthorized|missing token/i);
    });
});
