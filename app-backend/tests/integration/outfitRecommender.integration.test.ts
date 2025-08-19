import prisma from "../../src/prisma";
import { Style, LayerCategory, Category } from "@prisma/client";
import { recommendOutfits } from "../../src/modules/outfit/outfitRecommender.service";

// Deterministic URL without hitting real CDN logic
jest.mock("../../src/utils/s3", () => ({
  cdnUrlFor: (key: string) => `cdn://${key}`,
}));

// Make KNN stable & fast for tests
jest.mock("../../src/modules/outfit/itemItemKnn", () => ({
  // Feature vector length just needs to be consistent with kMeans usage
  getFeatureVector: (_rec: any) => [1, 0, 0, 0, 0],
  predictRatingKnn: () => 3.2,
  cosineSimilarity: () => 1,
}));

// Helpers
async function createUser(email: string) {
  return prisma.user.create({
    data: { name: email.split("@")[0], email, password: "Password!1" },
  });
}
async function createPref(userId: string, prefs?: Partial<{ style: Style; preferredColours: string[] }>) {
  return prisma.userPreference.upsert({
    where: { userId },
    update: { style: prefs?.style ?? Style.Casual, preferredColours: prefs?.preferredColours ?? ["#1a1a1a"] },
    create: { userId, style: prefs?.style ?? Style.Casual, preferredColours: prefs?.preferredColours ?? ["#1a1a1a"] },
  });
}
async function addItem(ownerId: string, data: Partial<Parameters<typeof prisma.closetItem.create>[0]["data"]>) {
  const defaults = {
    filename: `${Math.random().toString(36).slice(2)}.jpg`,
    category: Category.TSHIRT,
    layerCategory: LayerCategory.base_top,
    style: Style.Casual,
    colorHex: "#222222",
    dominantColors: ["#222222"],
    warmthFactor: 3,
    waterproof: false,
  };
  return prisma.closetItem.create({ data: { ownerId, ...defaults, ...data } as any });
}

describe("Integration: outfitRecommender.service", () => {
  let user: any;

  beforeEach(async () => {
    // Truncate in dependency order
    await prisma.outfitItem.deleteMany();
    await prisma.outfit.deleteMany();
    await prisma.closetItem.deleteMany();
    await prisma.userPreference.deleteMany();
    await prisma.user.deleteMany();

    user = await createUser("recommender@example.com");
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns base layers only for warm weather (no mid/outer)", async () => {
    await createPref(user.id, { style: Style.Casual, preferredColours: ["#222222"] });

    // Seed just enough items per required layer
    await addItem(user.id, { layerCategory: LayerCategory.base_top, category: Category.TSHIRT, warmthFactor: 2 });
    await addItem(user.id, { layerCategory: LayerCategory.base_bottom, category: Category.PANTS, warmthFactor: 2 });
    await addItem(user.id, { layerCategory: LayerCategory.footwear, category: Category.SHOES, warmthFactor: 2 });

    await addItem(user.id, { layerCategory: LayerCategory.base_top,    category: Category.TSHIRT, warmthFactor: 4 });
    await addItem(user.id, { layerCategory: LayerCategory.base_bottom, category: Category.PANTS,  warmthFactor: 4 });
    await addItem(user.id, { layerCategory: LayerCategory.footwear,    category: Category.SHOES,  warmthFactor: 4 });


    const res = await recommendOutfits(user.id, {
      style: Style.Casual,
      weatherSummary: { avgTemp: 24, minTemp: 18, willRain: false },
    } as any);

    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBeGreaterThan(0);

    // Ensure no mid_top/outerwear in any outfit items
    for (const r of res) {
      const layers = r.outfitItems.map(i => i.layerCategory);
      expect(layers).toEqual(expect.arrayContaining(["base_top", "base_bottom", "footwear"]));
      expect(layers).not.toContain("mid_top");
      expect(layers).not.toContain("outerwear");
      // URL built via cdn
      r.outfitItems.forEach(i => expect(i.imageUrl.startsWith("cdn://")).toBe(true));
    }
  });

  it("adds mid_top and outerwear for cold weather (minTemp < 10) and respects minimum warmth per layer", async () => {
    await createPref(user.id, { style: Style.Casual });

    // Base layers
    await addItem(user.id, { layerCategory: LayerCategory.base_top, category: Category.LONGSLEEVE, warmthFactor: 5 });
    await addItem(user.id, { layerCategory: LayerCategory.base_bottom, category: Category.PANTS, warmthFactor: 5 });
    await addItem(user.id, { layerCategory: LayerCategory.footwear, category: Category.SHOES, warmthFactor: 5 });
    // Cold-required layers
    await addItem(user.id, { layerCategory: LayerCategory.mid_top, category: Category.SWEATER, warmthFactor: 6 });
    await addItem(user.id, { layerCategory: LayerCategory.outerwear, category: Category.JACKET, warmthFactor: 7 });

    const res = await recommendOutfits(user.id, {
      style: Style.Casual,
      weatherSummary: { avgTemp: 8, minTemp: 6, willRain: false },
    } as any);

    expect(res.length).toBeGreaterThan(0);
    const layers = res[0].outfitItems.map(i => i.layerCategory);
    expect(layers).toEqual(expect.arrayContaining(["base_top", "base_bottom", "footwear", "mid_top", "outerwear"]));
  });

  it("returns empty when warmth totals cannot meet required minimum, then succeeds after adding warmer items", async () => {
    await createPref(user.id, { style: Style.Casual });

    // Too cold, but items are too thin
    await addItem(user.id, { layerCategory: LayerCategory.base_top, category: Category.LONGSLEEVE, warmthFactor: 1 });
    await addItem(user.id, { layerCategory: LayerCategory.base_bottom, category: Category.PANTS, warmthFactor: 1 });
    await addItem(user.id, { layerCategory: LayerCategory.footwear, category: Category.SHOES, warmthFactor: 1 });
    await addItem(user.id, { layerCategory: LayerCategory.mid_top, category: Category.SWEATER, warmthFactor: 1 });
    await addItem(user.id, { layerCategory: LayerCategory.outerwear, category: Category.JACKET, warmthFactor: 1 });

    const cold = await recommendOutfits(user.id, {
      style: Style.Casual,
      weatherSummary: { avgTemp: 5, minTemp: 2, willRain: false },
    } as any);

    expect(cold.length).toBe(0);

    // Add warmer alternates
    await addItem(user.id, { layerCategory: LayerCategory.base_top, warmthFactor: 5 });
    await addItem(user.id, { layerCategory: LayerCategory.base_bottom, warmthFactor: 5 });
    await addItem(user.id, { layerCategory: LayerCategory.mid_top, warmthFactor: 6 });
    await addItem(user.id, { layerCategory: LayerCategory.outerwear, warmthFactor: 7 });
    await addItem(user.id, { layerCategory: LayerCategory.footwear, warmthFactor: 5 });

    const ok = await recommendOutfits(user.id, {
      style: Style.Casual,
      weatherSummary: { avgTemp: 5, minTemp: 2, willRain: false },
    } as any);

    expect(ok.length).toBeGreaterThan(0);
  });

  it("prefers waterproof when raining (at least one selected outfit is waterproof)", async () => {
    await createPref(user.id, { style: Style.Casual });

    // Base with waterproof shoes/jacket options
    await addItem(user.id, { layerCategory: LayerCategory.base_top, category: Category.LONGSLEEVE, warmthFactor: 3 });
    await addItem(user.id, { layerCategory: LayerCategory.base_bottom, category: Category.PANTS, warmthFactor: 3 });
    await addItem(user.id, { layerCategory: LayerCategory.footwear, category: Category.SHOES, warmthFactor: 3, waterproof: true });
    await addItem(user.id, { layerCategory: LayerCategory.mid_top, category: Category.SWEATER, warmthFactor: 4 });
    await addItem(user.id, { layerCategory: LayerCategory.outerwear, category: Category.JACKET, warmthFactor: 5, waterproof: true });
    await addItem(user.id, { layerCategory: LayerCategory.base_top,    category: Category.LONGSLEEVE, warmthFactor: 4 });
    await addItem(user.id, { layerCategory: LayerCategory.base_bottom, category: Category.PANTS,      warmthFactor: 5 });
    await addItem(user.id, { layerCategory: LayerCategory.footwear,    category: Category.SHOES,      warmthFactor: 5, waterproof: true });
    await addItem(user.id, { layerCategory: LayerCategory.mid_top,     category: Category.SWEATER,     warmthFactor: 6 });
    await addItem(user.id, { layerCategory: LayerCategory.outerwear,   category: Category.JACKET,      warmthFactor: 7, waterproof: true });




    const res = await recommendOutfits(user.id, {
      style: Style.Casual,
      weatherSummary: { avgTemp: 12, minTemp: 9, willRain: true },
    } as any);

    expect(res.length).toBeGreaterThan(0);
    // At least one recommended outfit should be marked waterproof
    expect(res.some(r => r.waterproof)).toBe(true);
  });

  it("honours preferred colours (ensures items include preferred colour and URLs come from cdn)", async () => {
    await createPref(user.id, { style: Style.Casual, preferredColours: ["#ff0000"] });

    await addItem(user.id, {
      layerCategory: LayerCategory.base_top,
      category: Category.TSHIRT,
      dominantColors: ["#ff0000"], // preferred
      warmthFactor: 2,
    });
    await addItem(user.id, { layerCategory: LayerCategory.base_bottom, category: Category.PANTS, warmthFactor: 2 });
    await addItem(user.id, { layerCategory: LayerCategory.footwear, category: Category.SHOES, warmthFactor: 2 });
    await addItem(user.id, {
        layerCategory: LayerCategory.base_top,
        category: Category.TSHIRT,
        dominantColors: ["#ff0000"],
        warmthFactor: 4,
    });
    await addItem(user.id, { layerCategory: LayerCategory.base_bottom, category: Category.PANTS,  warmthFactor: 4 });
    await addItem(user.id, { layerCategory: LayerCategory.footwear,    category: Category.SHOES,  warmthFactor: 4 });


    const res = await recommendOutfits(user.id, {
      style: Style.Casual,
      weatherSummary: { avgTemp: 23, minTemp: 18, willRain: false },
    } as any);

    expect(res.length).toBeGreaterThan(0);
    // Check urls and that at least one item carries the preferred colour
    const flat = res.flatMap(r => r.outfitItems);
    expect(flat.every(i => i.imageUrl.startsWith("cdn://"))).toBe(true);
    expect(flat.some(i => (i.dominantColors || []).includes("#ff0000"))).toBe(true);
  });

  it("uses rating history path (adds past rated outfit) without throwing and returns up to 5 clustered picks", async () => {
    await createPref(user.id, { style: Style.Casual });

    // Seed a full cold set so we have multiple candidates
    const ids: string[] = [];
    const make = async (layer: LayerCategory, warmthFactor: number) => {
      const it = await addItem(user.id, { layerCategory: layer, warmthFactor, category: Category.TSHIRT });
      ids.push(it.id);
      return it;
    };
    await make(LayerCategory.base_top, 5);
    await make(LayerCategory.base_bottom, 5);
    await make(LayerCategory.footwear, 5);
    await make(LayerCategory.mid_top, 6);
    await make(LayerCategory.outerwear, 7);

    // Add a past rated outfit (history vector consumed by KNN)
    const past = await prisma.outfit.create({
      data: {
        userId: user.id,
        overallStyle: Style.Casual,
        userRating: 5,
        warmthRating: 28,
        waterproof: false,
        weatherSummary: JSON.stringify({ avgTemp: 10, minTemp: 8, willRain: false }),
        outfitItems: {
          create: ids.map((closetItemId, idx) => ({
            closetItemId,
            layerCategory: "base_top" as any,
            sortOrder: idx,
          })),
        },
      },
      include: { outfitItems: true },
    });
    expect(past.id).toBeTruthy();

    const res = await recommendOutfits(user.id, {
      style: Style.Casual,
      weatherSummary: { avgTemp: 9, minTemp: 7, willRain: false },
    } as any);

    expect(res.length).toBeGreaterThan(0);
    expect(res.length).toBeLessThanOrEqual(5); // clustering limits to max 5 selections
    // Structure sanity
    const first = res[0];
    expect(first).toHaveProperty("overallStyle");
    expect(first).toHaveProperty("outfitItems");
    expect(Array.isArray(first.outfitItems)).toBe(true);
  });
});
