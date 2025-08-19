// tests/packing/packing.controller.unit.test.ts
import { Request, Response } from "express";
import * as packingController from "../../src/modules/packing/packing.controller";
import * as packingService from "../../src/modules/packing/packing.service";

// ---- Mock the service layer completely ----
jest.mock("../../src/modules/packing/packing.service", () => ({
  createPackingList: jest.fn(),
  getPackingList: jest.fn(),
  updatePackingList: jest.fn(),
  deletePackingList: jest.fn(),
}));

type AnyReq = Partial<Request> & { user?: { id: string } };

// Handy response mock
const mockRes = (): Response => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn(),
  };
  return res as Response;
};

const user = { id: "user-1" };

describe("PackingController Unit Tests", () => {
  beforeEach(() => jest.clearAllMocks());

  // ----------------- CREATE -----------------
  it("createPackingList: creates a list (201)", async () => {
    const req = {
      user,
      body: {
        tripId: "trip-1",
        items: ["item-1", "item-2"],
        outfits: ["outfit-1"],
        others: ["charger", "toothbrush"],
      },
    } as AnyReq as Request;
    const res = mockRes();

    const created = {
      id: "list-1",
      userId: user.id,
      tripId: "trip-1",
      items: [],
      outfits: [],
      others: [],
    };
    (packingService.createPackingList as jest.Mock).mockResolvedValueOnce(created);

    await packingController.createPackingList(req as any, res);

    expect(packingService.createPackingList).toHaveBeenCalledWith(
      "user-1",
      "trip-1",
      ["item-1", "item-2"],
      ["outfit-1"],
      ["charger", "toothbrush"]
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(created);
  });

  it("createPackingList: 401 when no auth", async () => {
    const req = { user: undefined, body: {} } as AnyReq as Request;
    const res = mockRes();

    await packingController.createPackingList(req as any, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    expect(packingService.createPackingList).not.toHaveBeenCalled();
  });

  it("createPackingList: 400 when tripId missing", async () => {
    const req = { user, body: {} } as AnyReq as Request;
    const res = mockRes();

    await packingController.createPackingList(req as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Missing tripId" });
    expect(packingService.createPackingList).not.toHaveBeenCalled();
  });

  it("createPackingList: 400 when items/outfits/others not arrays", async () => {
    const req = {
      user,
      body: {
        tripId: "trip-1",
        items: "not-array",
        outfits: [],
        others: {},
      },
    } as unknown as Request;
    const res = mockRes();

    await packingController.createPackingList(req as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "items, outfits, and others must be arrays",
    });
    expect(packingService.createPackingList).not.toHaveBeenCalled();
  });

  it("createPackingList: 409 when service throws conflict (already exists)", async () => {
    const req = {
      user,
      body: { tripId: "trip-1", items: [], outfits: [], others: [] },
    } as AnyReq as Request;
    const res = mockRes();

    const err = Object.assign(new Error("A packing list already exists for this trip"), {
      statusCode: 409,
    });
    (packingService.createPackingList as jest.Mock).mockRejectedValueOnce(err);

    await packingController.createPackingList(req as any, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: "A packing list already exists for this trip",
    });
  });

  it("createPackingList: maps raw Prisma P2002 to user-friendly message (fallback)", async () => {
    const req = {
      user,
      body: { tripId: "trip-1", items: [], outfits: [], others: [] },
    } as AnyReq as Request;
    const res = mockRes();

    const err = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    (packingService.createPackingList as jest.Mock).mockRejectedValueOnce(err);

    await packingController.createPackingList(req as any, res);

    // Controller transforms P2002 -> friendly message, default 500 when no statusCode provided
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "A packing list already exists for this trip.",
    });
  });

  it("createPackingList: 500 on unknown error", async () => {
    const req = {
      user,
      body: { tripId: "trip-1", items: [], outfits: [], others: [] },
    } as AnyReq as Request;
    const res = mockRes();

    (packingService.createPackingList as jest.Mock).mockRejectedValueOnce(
      new Error("boom")
    );

    await packingController.createPackingList(req as any, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "boom" });
  });

  // ----------------- GET -----------------
  it("getPackingList: returns list (200)", async () => {
    const req = { user, params: { tripId: "trip-1" } } as AnyReq as Request;
    const res = mockRes();

    const list = { id: "list-1", userId: user.id, tripId: "trip-1" };
    (packingService.getPackingList as jest.Mock).mockResolvedValueOnce(list);

    await packingController.getPackingList(req as any, res);

    expect(packingService.getPackingList).toHaveBeenCalledWith("user-1", "trip-1");
    expect(res.json).toHaveBeenCalledWith(list);
  });

  it("getPackingList: 401 when no auth", async () => {
    const req = { user: undefined, params: { tripId: "trip-1" } } as AnyReq as Request;
    const res = mockRes();

    await packingController.getPackingList(req as any, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
  });

  it("getPackingList: 400 when tripId missing", async () => {
    const req = { user, params: {} } as AnyReq as Request;
    const res = mockRes();

    await packingController.getPackingList(req as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Missing tripId" });
  });

  it("getPackingList: 404 when list not found", async () => {
    const req = { user, params: { tripId: "trip-x" } } as AnyReq as Request;
    const res = mockRes();

    (packingService.getPackingList as jest.Mock).mockResolvedValueOnce(null);

    await packingController.getPackingList(req as any, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Packing list not found" });
  });

  it("getPackingList: 500 on error", async () => {
    const req = { user, params: { tripId: "trip-1" } } as AnyReq as Request;
    const res = mockRes();

    (packingService.getPackingList as jest.Mock).mockRejectedValueOnce(new Error("db"));

    await packingController.getPackingList(req as any, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "db" });
  });

  // ----------------- UPDATE -----------------
  it("updatePackingList: updates and returns list (200)", async () => {
    const req = {
      user,
      params: { listId: "list-1" },
      body: {
        items: [{ id: "pi-1", packed: true }],
        outfits: [{ id: "po-1", packed: false }],
        others: [{ id: "px-1", packed: true }],
      },
    } as AnyReq as Request;
    const res = mockRes();

    const updated = { id: "list-1", items: [], outfits: [], others: [] };
    (packingService.updatePackingList as jest.Mock).mockResolvedValueOnce(updated);

    await packingController.updatePackingList(req as any, res);

    expect(packingService.updatePackingList).toHaveBeenCalledWith(
      "user-1",
      "list-1",
      [{ id: "pi-1", packed: true }],
      [{ id: "po-1", packed: false }],
      [{ id: "px-1", packed: true }]
    );
    expect(res.json).toHaveBeenCalledWith(updated);
  });

  it("updatePackingList: 401 when no auth", async () => {
    const req = { user: undefined, params: { listId: "list-1" }, body: {} } as AnyReq as Request;
    const res = mockRes();

    await packingController.updatePackingList(req as any, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
  });

  it("updatePackingList: 400 when listId missing", async () => {
    const req = { user, params: {}, body: {} } as AnyReq as Request;
    const res = mockRes();

    await packingController.updatePackingList(req as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Missing listId" });
  });

  it("updatePackingList: 400 when items/outfits/others not arrays", async () => {
    const req = {
      user,
      params: { listId: "list-1" },
      body: {
        items: "bad",
        outfits: [],
        others: null,
      },
    } as unknown as Request;
    const res = mockRes();

    await packingController.updatePackingList(req as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "items, outfits, and others must be arrays",
    });
    expect(packingService.updatePackingList).not.toHaveBeenCalled();
  });

  it("updatePackingList: propagates service status code (e.g., 404)", async () => {
    const req = {
      user,
      params: { listId: "list-x" },
      body: { items: [], outfits: [], others: [] },
    } as AnyReq as Request;
    const res = mockRes();

    const err = Object.assign(new Error("Packing list not found"), { statusCode: 404 });
    (packingService.updatePackingList as jest.Mock).mockRejectedValueOnce(err);

    await packingController.updatePackingList(req as any, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Packing list not found" });
  });

  it("updatePackingList: 500 on unknown error", async () => {
    const req = {
      user,
      params: { listId: "list-1" },
      body: { items: [], outfits: [], others: [] },
    } as AnyReq as Request;
    const res = mockRes();

    (packingService.updatePackingList as jest.Mock).mockRejectedValueOnce(new Error("oops"));

    await packingController.updatePackingList(req as any, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "oops" });
  });

  // ----------------- DELETE -----------------
  it("deletePackingList: deletes (204)", async () => {
    const req = { user, params: { listId: "list-1" } } as AnyReq as Request;
    const res = mockRes();

    (packingService.deletePackingList as jest.Mock).mockResolvedValueOnce(true);

    await packingController.deletePackingList(req as any, res);

    expect(packingService.deletePackingList).toHaveBeenCalledWith("user-1", "list-1");
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });

  it("deletePackingList: 401 when no auth", async () => {
    const req = { user: undefined, params: { listId: "list-1" } } as AnyReq as Request;
    const res = mockRes();

    await packingController.deletePackingList(req as any, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    expect(packingService.deletePackingList).not.toHaveBeenCalled();
  });

  it("deletePackingList: 400 when listId missing", async () => {
    const req = { user, params: {} } as AnyReq as Request;
    const res = mockRes();

    await packingController.deletePackingList(req as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Missing listId" });
  });

  it("deletePackingList: 404 from service", async () => {
    const req = { user, params: { listId: "list-x" } } as AnyReq as Request;
    const res = mockRes();

    const err = Object.assign(new Error("Packing list not found"), { statusCode: 404 });
    (packingService.deletePackingList as jest.Mock).mockRejectedValueOnce(err);

    await packingController.deletePackingList(req as any, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Packing list not found" });
  });

  it("deletePackingList: 500 on unknown error", async () => {
    const req = { user, params: { listId: "list-1" } } as AnyReq as Request;
    const res = mockRes();

    (packingService.deletePackingList as jest.Mock).mockRejectedValueOnce(
      new Error("unexpected")
    );

    await packingController.deletePackingList(req as any, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "unexpected" });
  });
});