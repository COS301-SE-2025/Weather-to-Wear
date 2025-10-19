// src/components/tryon/TryOnCanvas.tsx
import React, { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import { FRONT_V1, anchorForLayer } from "./anchors";

type Node2D = PIXI.Container | PIXI.Sprite;

export type TryOnItem = {
    id: string;
    url: string;
    layerCategory:
    | "base_top"
    | "base_bottom"
    | "mid_top"
    | "mid_bottom"
    | "outerwear"
    | "footwear"
    | "headwear"
    | "accessory";
    fit?: {
        x: number; // normalized to mannequin width
        y: number; // normalized to mannequin height
        scale: number;
        rotationDeg: number;
        mesh?: { x: number; y: number }[];
    };
    z?: number;
};

export type FitTransform = {
    x: number;
    y: number;
    scale: number;
    rotationDeg: number;
    mesh?: { x: number; y: number }[];
};

const texCache = new Map<string, PIXI.Texture>();
function clearTexCache() {
    texCache.forEach((t) => {
        try { t.destroy(true); } catch { }
    });
    texCache.clear();
}
function loadTexture(url: string): Promise<PIXI.Texture> {
    if (!url) return Promise.reject(new Error("empty url"));
    const hit = texCache.get(url);
    if (hit) return Promise.resolve(hit);
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const tex = PIXI.Texture.from(img);
            texCache.set(url, tex);
            resolve(tex);
        };
        img.onerror = () => reject(new Error("Failed to load " + url));
        img.src = url;
    });
}

function onTexReady(tex: PIXI.Texture, cb: () => void) {
    if ((tex as any).valid) {
        cb();
        return;
    }
    const once = () => {
        requestAnimationFrame(cb);
    };
    (tex as any).once?.("update", once);
    (tex.baseTexture as any)?.once?.("update", once);
}


function preloadTextures(urls: string[]) {
    const unique = Array.from(new Set(urls.filter(Boolean)));
    return Promise.all(unique.map(loadTexture));
}
function getTex(url: string): PIXI.Texture {
    return texCache.get(url) ?? PIXI.Texture.from(url);
}

export default function TryOnCanvas({
    mannequinFrames,
    frameIndex,
    items,
    responsive = true,
    editable = false,
    onChangeFit,
}: {
    mannequinFrames: string[];      // e.g. ['/mannequins/front_v1.png', ... 'front_v8.png']
    frameIndex: number;             // 0..7
    items: TryOnItem[];
    responsive?: boolean;
    editable?: boolean;
    onChangeFit?: (itemId: string, transform: FitTransform) => void;
}) {
    const hostRef = useRef<HTMLDivElement>(null);

    const DEBUG_ANCHORS = false;
    const DEBUG_GRID = false;

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const requestLayout = useRef<null | (() => void)>(null);

    // we keep persistent refs so we can swap textures without re-creating the app
    const appRef = useRef<PIXI.Application | null>(null);
    const mannequinRef = useRef<PIXI.Sprite | null>(null);
    const overlayRef = useRef<PIXI.Container | null>(null); // occluders
    const gizmoLayerRef = useRef<PIXI.Container | null>(null);

    // geometry cache
    const nodeByIdRef = useRef<Map<string, Node2D>>(new Map());
    const spriteInfoRef = useRef<
        Map<string, { baseScale: number; anchorCenter: { x: number; y: number }; stageX: number; stageY: number; stageScale: number; stageRotation: number; }>
    >(new Map());
    const localFitsRef = useRef<Map<string, FitTransform>>(new Map());

    const sizeRef = useRef({ manW: 0, manH: 0 });

    // forward decl
    let drawGizmo: (forcedId?: string, startDragEv?: PIXI.FederatedPointerEvent) => void;

    const rad = (deg: number) => (deg * Math.PI) / 180;

    const layoutAll = () => {
        const app = appRef.current;
        const mannequin = mannequinRef.current;
        if (!app || !mannequin) return;

        const stage = app.stage;
        const renderer = app.renderer;
        const pose = FRONT_V1; // anchors identical across frames per your spec

        const { manW, manH } = sizeRef.current;

        const toStageX = (nx: number) => mannequin.x + (nx - 0.5) * manW;
        const toStageY = (ny: number) => mannequin.y + (ny - 0.5) * manH;
        const boxToStage = (b: { x: number; y: number; w: number; h: number }) => ({
            cx: toStageX(b.x + b.w / 2),
            cy: toStageY(b.y + b.h / 2),
            pw: b.w * manW,
            ph: b.h * manH,
        });

        const zFor = (layer: keyof typeof FRONT_V1.layerDefaults) =>
            FRONT_V1.layerDefaults[layer]?.z ?? 500;

        const ensureNormalized = (x: number, y: number) => {
            const absMax = Math.max(Math.abs(x), Math.abs(y));
            if (absMax <= 2) return { nx: x, ny: y };
            return { nx: x / Math.max(1, manW), ny: y / Math.max(1, manH) };
        };

        const getEffectiveFit = (id: string, fallback?: FitTransform) =>
            localFitsRef.current.get(id) ?? fallback;

        // garments (non-footwear)
        items
            .filter((it) => !!it.url && it.layerCategory !== "footwear")
            .forEach((it) => {
                const tex = getTex(it.url);
                if (!tex || !(tex as any).valid) {
                    if (tex) onTexReady(tex, () => requestLayout.current?.());
                    return; // skip now; we'll come back when it’s ready
                }

                let node = nodeByIdRef.current.get(it.id) as PIXI.Sprite | undefined;
                if (!node) {
                    node = new PIXI.Sprite(tex);
                    node.anchor.set(0.5);
                    node.name = it.id;
                    stage.addChild(node);
                    nodeByIdRef.current.set(it.id, node);

                    node.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
                        if (!editable) return;
                        e.stopPropagation();
                        setSelectedId(it.id);
                        drawGizmo(it.id, e);
                    });
                } else {
                    if ((node.texture as any)?.baseTexture?.resource?.url !== it.url) {
                        node.texture = tex;
                    }
                }

                node.eventMode = editable ? "static" : "none";
                node.cursor = editable ? "grab" : "default";
                node.zIndex = zFor(it.layerCategory);

                const anchor = anchorForLayer(it.layerCategory, pose);
                const { cx, cy, pw, ph } = anchor
                    ? boxToStage(anchor)
                    : { cx: renderer.width / 2, cy: renderer.height / 2, pw: manW * 0.3, ph: manH * 0.3 };

                const baseScale = Math.min(pw / node.texture.width, ph / node.texture.height);

                const effFit = getEffectiveFit(it.id, it.fit);
                const norm =
                    effFit && typeof effFit.x === "number" && typeof effFit.y === "number"
                        ? ensureNormalized(effFit.x, effFit.y)
                        : { nx: 0, ny: 0 };

                const offsetX = norm.nx * manW;
                const offsetY = norm.ny * manH;
                const scl = (effFit?.scale ?? 1) * baseScale;
                const rot = rad(effFit?.rotationDeg ?? 0);

                node.x = cx + offsetX;
                node.y = cy + offsetY;
                node.scale.set(scl);
                node.rotation = rot;

                spriteInfoRef.current.set(it.id, {
                    baseScale,
                    anchorCenter: { x: cx, y: cy },
                    stageX: node.x,
                    stageY: node.y,
                    stageScale: scl,
                    stageRotation: rot,
                });
            });

        // footwear: mirror left→right, save as base (left) id
        items
            .filter((i) => i.layerCategory === "footwear" && !!i.url)
            .forEach((it) => {
                const tex = getTex(it.url);
                if (!tex || !(tex as any).valid) {
                    if (tex) onTexReady(tex, () => requestLayout.current?.());
                    return;
                }

                const lb = boxToStage(FRONT_V1.boxes.LEFT_SHOE_BOX);
                const rb = boxToStage(FRONT_V1.boxes.RIGHT_SHOE_BOX);
                const leftId = `${it.id}|L`;
                const rightId = `${it.id}|R`;

                const baseFit = getEffectiveFit(it.id, it.fit) || { x: 0, y: 0, scale: 1, rotationDeg: 0 };

                const place = (id: string, box: typeof lb, mirrorX: boolean) => {
                    let spr = nodeByIdRef.current.get(id) as PIXI.Sprite | undefined;
                    if (!spr) {
                        spr = new PIXI.Sprite(tex);
                        spr.anchor.set(0.5);
                        spr.name = id;
                        spr.zIndex = FRONT_V1.layerDefaults.footwear.z;
                        spr.eventMode = editable ? "static" : "none";
                        spr.cursor = editable ? "grab" : "default";
                        app.stage.addChild(spr);
                        nodeByIdRef.current.set(id, spr);

                        spr.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
                            if (!editable) return;
                            e.stopPropagation();
                            setSelectedId(leftId);
                            drawGizmo(leftId, e);
                        });
                    } else {
                        spr.zIndex = FRONT_V1.layerDefaults.footwear.z;
                        spr.eventMode = editable ? "static" : "none";
                        spr.cursor = editable ? "grab" : "default";
                    }

                    const base = Math.min(box.pw / tex.width, box.ph / tex.height);
                    const norm = ((x: number, y: number) => {
                        const absMax = Math.max(Math.abs(x), Math.abs(y));
                        if (absMax <= 2) return { nx: x, ny: y };
                        return { nx: x / Math.max(1, manW), ny: y / Math.max(1, manH) };
                    })(baseFit.x ?? 0, baseFit.y ?? 0);

                    const nx = mirrorX ? -norm.nx : norm.nx;
                    const ny = norm.ny;

                    spr.x = box.cx + nx * manW;
                    spr.y = box.cy + ny * manH;

                    const sMag = (baseFit.scale ?? 1) * base;
                    spr.scale.set((mirrorX ? -1 : 1) * sMag, sMag);
                    spr.rotation = rad(baseFit.rotationDeg ?? 0);

                    if (!mirrorX) {
                        spriteInfoRef.current.set(leftId, {
                            baseScale: base,
                            anchorCenter: { x: box.cx, y: box.cy },
                            stageX: spr.x,
                            stageY: spr.y,
                            stageScale: sMag,
                            stageRotation: spr.rotation,
                        });
                    }
                };

                place(leftId, lb, false);
                place(rightId, rb, true);
            });

        // occlusion (per-frame if present)
        let overlay = overlayRef.current;
        if (!overlay) {
            overlay = new PIXI.Container();
            overlayRef.current = overlay;
        }
        if (!overlay.parent) {
            overlay.zIndex = 550;
            app.stage.addChild(overlay);
        }
        overlay.removeChildren();

        const currentFrameUrl = mannequinFrames[frameIndex];
        const frameStem = currentFrameUrl.replace(/\.(png|jpg|jpeg|webp)$/i, "");
        const occCandidates = [
            `${frameStem}_forearms.png`,
            "/mannequins/front_v1_forearms.png",
        ];
        const headCandidates = [
            `${frameStem}_head.png`,
            "/mannequins/front_v1_head.png",
        ];

        const addIfExists = (url: string) => {
            const tex = texCache.get(url);
            if (tex && tex.width > 0) {
                const s = new PIXI.Sprite(tex);
                s.anchor.set(0.5);
                s.x = mannequin.x;
                s.y = mannequin.y;
                s.scale.set(mannequin.scale.x);
                s.eventMode = "none";
                overlay!.addChild(s);
                return true;
            }
            return false;
        };
        occCandidates.some(addIfExists);
        headCandidates.some(addIfExists);

        drawGizmo(selectedId ?? undefined, undefined);
        app.stage.sortChildren();
    };

    const commit = (id: string) => {
        const mannequin = mannequinRef.current;
        if (!mannequin) return;
        const spr = nodeByIdRef.current.get(id) as any;
        const info = spriteInfoRef.current.get(id.includes("|") ? `${id.split("|")[0]}|L` : id);
        if (!spr || !info) return;

        const { manW, manH } = sizeRef.current;
        const dx = spr.x - info.anchorCenter.x;
        const dy = spr.y - info.anchorCenter.y;
        const nx = dx / Math.max(1, manW);
        const ny = dy / Math.max(1, manH);
        const relScale = spr.scale.x / Math.max(1e-6, info.baseScale);
        const relScaleAbs = Math.abs(relScale);
        const rotationDeg = (spr.rotation * 180) / Math.PI;

        const t: FitTransform = { x: nx, y: ny, scale: relScaleAbs, rotationDeg };
        const baseId = id.includes("|") ? id.split("|")[0] : id;

        onChangeFit?.(baseId, t);
        localFitsRef.current.set(baseId, t);
    };

    const setStageHitArea = () => {
        const app = appRef.current;
        if (!app) return;
        const stage = app.stage;
        const r = app.renderer;
        stage.eventMode = "static";
        stage.hitArea = new PIXI.Rectangle(0, 0, r.width, r.height);
        stage.removeAllListeners("pointerdown");
        stage.on("pointerdown", () => {
            if (!editable) return;
            setSelectedId(null);
            gizmoLayerRef.current?.removeChildren();
        });
    };

    const resizeAndRelayout = () => {
        const app = appRef.current;
        const mannequin = mannequinRef.current;
        if (!app || !mannequin) return;

        const hostEl = hostRef.current!;
        const containerWidth = hostEl.clientWidth;
        const containerHeight = hostEl.clientHeight;
        const renderer = app.renderer;
        renderer.resize(containerWidth, containerHeight);
        setStageHitArea();

        mannequin.x = containerWidth / 2;
        mannequin.y = containerHeight / 2;

        const manTex = mannequin.texture;
        const aspectRatio = manTex.width / manTex.height;
        const targetHeight = containerHeight * 0.8;
        const targetWidth = targetHeight * aspectRatio;

        let finalWidth = targetWidth;
        let finalHeight = targetHeight;
        if (targetWidth > containerWidth * 0.9) {
            finalWidth = containerWidth * 0.9;
            finalHeight = finalWidth / aspectRatio;
        }

        const manScale = finalHeight / manTex.height;
        mannequin.scale.set(manScale);

        sizeRef.current.manW = manTex.width * manScale;
        sizeRef.current.manH = manTex.height * manScale;

        layoutAll();
    };

    // one-time init
    useEffect(() => {
        const hostEl = hostRef.current;
        if (!hostEl) return;

        let destroyed = false;

        (async () => {
            const app = new PIXI.Application();
            const DPR = Math.min(Math.max(window.devicePixelRatio || 1, 1), 3);
            await app.init({
                backgroundAlpha: 0,
                antialias: true,
                autoDensity: true,
                resolution: DPR,
                powerPreference: "high-performance",
            });
            if (destroyed) {
                app.destroy(true);
                return;
            }
            appRef.current = app;
            app.stage.sortableChildren = true;

            const cw = hostEl.clientWidth;
            const ch = hostEl.clientHeight;
            app.renderer.resize(cw, ch);

            (app.canvas as HTMLCanvasElement).classList.add("mannequin-canvas");
            (app.canvas as HTMLCanvasElement).style.transform = "translateZ(0)";
            while (hostEl.firstChild) hostEl.removeChild(hostEl.firstChild);
            hostEl.appendChild(app.canvas as any);

            setStageHitArea();

            clearTexCache();
            // Preload: all frames + garments + generic icons + optional occluders
            const garmentUrls = items.map((i) => i.url).filter(Boolean);
            const frameUrls = mannequinFrames;
            const overlayGuesses = frameUrls.flatMap((u) => {
                const stem = u.replace(/\.(png|jpg|jpeg|webp)$/i, "");
                return [`${stem}_forearms.png`, `${stem}_head.png`];
            });
            const iconQueue = ["/ui/tryon/handle-rotate.svg", "/ui/tryon/handle-scale.svg"];
            await preloadTextures([...frameUrls, ...garmentUrls, ...overlayGuesses, ...iconQueue, "/mannequins/front_v1_forearms.png", "/mannequins/front_v1_head.png"]).catch(() => { });

            // mannequin
            const firstTex = getTex(mannequinFrames[frameIndex] ?? mannequinFrames[0]);
            const mannequin = new PIXI.Sprite(firstTex);
            mannequin.anchor.set(0.5, 0.5);
            mannequin.zIndex = 100;
            app.stage.addChild(mannequin);
            mannequinRef.current = mannequin;

            // initial size
            sizeRef.current = { manW: 0, manH: 0 };


            const overlay = new PIXI.Container();
            overlayRef.current = overlay;

            const gizmoLayer = new PIXI.Container();
            gizmoLayer.zIndex = 10060;
            (gizmoLayer as any).interactiveChildren = true;
            gizmoLayer.eventMode = "static";
            gizmoLayerRef.current = gizmoLayer;
            app.stage.addChild(gizmoLayer);

            // now do initial sizing & layout
            sizeRef.current = { manW: 0, manH: 0 };
            resizeAndRelayout();

            // if (DEBUG_ANCHORS) {
            //     const g = new PIXI.Graphics();
            //     g.zIndex = 9999;

            //     const draw = (b: { x: number; y: number; w: number; h: number }, color = 0x00ff88) => {
            //         const { cx, cy, pw, ph } = boxToStage(b);
            //         g.setStrokeStyle({ width: 2, color, alpha: 0.9 });
            //         g.rect(cx - pw / 2, cy - ph / 2, pw, ph);
            //         g.stroke();
            //     };

            //     draw(FRONT_V1.boxes.CHEST_BOX, 0x00aaff);
            //     draw(FRONT_V1.boxes.WAIST_BOX, 0xffaa00);
            //     draw(FRONT_V1.boxes.HIP_BOX, 0xff00aa);
            //     draw(FRONT_V1.boxes.LEFT_SHOE_BOX, 0x66ff66);
            //     draw(FRONT_V1.boxes.RIGHT_SHOE_BOX, 0x66ff66);

            //     stage.addChild(g);
            // }

            // // ===== Debug Grid
            // if (DEBUG_GRID) {
            //     const grid = new PIXI.Graphics();
            //     grid.zIndex = 9998;

            //     const drawGrid = () => {
            //         grid.clear();
            //         grid.setStrokeStyle({ width: 2, color: 0x888888, alpha: 0.9 });
            //         grid.rect(mannequin!.x - manW / 2, mannequin!.y - manH / 2, manW, manH);
            //         grid.stroke();

            //         const drawLine = (x1: number, y1: number, x2: number, y2: number, major = false) => {
            //             grid.setStrokeStyle({
            //                 width: major ? 2 : 1,
            //                 color: major ? 0x00aaff : 0xcccccc,
            //                 alpha: major ? 0.9 : 0.6,
            //             });
            //             grid.moveTo(x1, y1);
            //             grid.lineTo(x2, y2);
            //             grid.stroke();
            //         };

            //         for (let t = 0; t <= 1.0001; t += 0.05) {
            //             const major = Math.abs((t * 100) % 10) < 1e-6;
            //             const sx = toStageX(t);
            //             drawLine(sx, mannequin!.y - manH / 2, sx, mannequin!.y + manH / 2, major);

            //             const sy = toStageY(t);
            //             drawLine(mannequin!.x - manW / 2, sy, mannequin!.x + manW / 2, sy, major);
            //         }

            //         const mkLabel = (txt: string, x: number, y: number) => {
            //             const label = new PIXI.Text({
            //                 text: txt,
            //                 style: { fill: 0x333333, fontSize: 12, align: "center" },
            //             });
            //             label.x = x;
            //             label.y = y;
            //             label.zIndex = 9999;
            //             stage.addChild(label);
            //             return label;
            //         };

            //         mkLabel("nx=0", toStageX(0) - 14, mannequin!.y - manH / 2 - 16);
            //         mkLabel("nx=0.5", toStageX(0.5) - 18, mannequin!.y - manH / 2 - 16);
            //         mkLabel("nx=1", toStageX(1) - 10, mannequin!.y - manH / 2 - 16);

            //         mkLabel("ny=0", mannequin!.x + manW / 2 + 6, toStageY(0) - 7);
            //         mkLabel("ny=0.5", mannequin!.x + manW / 2 + 6, toStageY(0.5) - 7);
            //         mkLabel("ny=1", mannequin!.x + manW / 2 + 6, toStageY(1) - 7);
            //     };

            //     drawGrid();
            //     stage.addChild(grid);

            //     const cross = new PIXI.Graphics();
            //     cross.zIndex = 10000;
            //     stage.addChild(cross);

            //     const tip = new PIXI.Text({
            //         text: "",
            //         style: { fill: 0x111111, fontSize: 12, fontFamily: "monospace" },
            //     });
            //     tip.zIndex = 10001;
            //     stage.addChild(tip);

            //     stage.eventMode = "static";
            //     stage.hitArea = new PIXI.Rectangle(0, 0, renderer.width, renderer.height);

            //     const fromStageNx = (sx2: number) => (sx2 - mannequin!.x) / manW + 0.5;
            //     const fromStageNy = (sy2: number) => (sy2 - mannequin!.y) / manH + 0.5;

            //     stage.on("pointermove", (e: PIXI.FederatedPointerEvent) => {
            //         // stage.on("globalpointermove", (e: PIXI.FederatedPointerEvent) => {
            //         const { x: sx, y: sy } = e.global;

            //         const nx = Math.max(0, Math.min(1, fromStageNx(sx)));
            //         const ny = Math.max(0, Math.min(1, fromStageNy(sy)));

            //         const inside =
            //             sx >= mannequin!.x - manW / 2 &&
            //             sx <= mannequin!.x + manW / 2 &&
            //             sy >= mannequin!.y - manH / 2 &&
            //             sy <= mannequin!.y + manH / 2;

            //         cross.clear();
            //         if (inside) {
            //             cross.setStrokeStyle({ width: 1, color: 0xff3366, alpha: 0.85 });
            //             cross.moveTo(toStageX(nx), mannequin!.y - manH / 2);
            //             cross.lineTo(toStageX(nx), mannequin!.y + manH / 2);
            //             cross.stroke();
            //             cross.moveTo(mannequin!.x - manW / 2, toStageY(ny));
            //             cross.lineTo(mannequin!.x + manW / 2, toStageY(ny));
            //             cross.stroke();

            //             tip.text = `nx=${nx.toFixed(3)}  ny=${ny.toFixed(3)}`;
            //             tip.x = toStageX(nx) + 8;
            //             tip.y = toStageY(ny) - 18;
            //             tip.alpha = 1;
            //         } else {
            //             tip.alpha = 0.2;
            //         }
            //     });
            // }

            // expose relayout
            requestLayout.current = layoutAll;
            setTimeout(() => { resizeAndRelayout(); }, 60);
        })();

        const ro = new ResizeObserver(() => {
            if (!destroyed && responsive) resizeAndRelayout();
        });
        ro.observe(hostEl);

        return () => {
            destroyed = true;
            ro.disconnect();
            try { appRef.current?.stage?.removeAllListeners(); } catch { }
            if (appRef.current) {
                appRef.current.destroy(true);
                appRef.current = null;
            }
            if (hostEl.firstChild) {
                try { hostEl.removeChild(hostEl.firstChild); } catch { }
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // init ONCE

    // hot-swap the mannequin texture when frameIndex changes (no re-mount)
    useEffect(() => {
        const mannequin = mannequinRef.current;
        if (!mannequin) return;
        const url = mannequinFrames[frameIndex] ?? mannequinFrames[0];
        const tex = getTex(url);
        if (!tex || tex.width === 0) return;

        // swap texture + recompute scale/geometry; garments stay put
        mannequin.texture = tex;
        resizeAndRelayout();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [frameIndex, mannequinFrames.join("|")]);

    // re-layout if items change (positions/urls)
    useEffect(() => {
        const urls = items.map(i => i.url).filter(Boolean);
        if (urls.length) {
            preloadTextures(urls).finally(() => requestLayout.current?.());
        } else {
            requestLayout.current?.();
        }
    }, [items]);

    // --- gizmo ---
    drawGizmo = (forcedId?: string, startDragEv?: PIXI.FederatedPointerEvent) => {
        const app = appRef.current;
        const gizmoLayer = gizmoLayerRef.current!;
        if (!app) return;

        const id = forcedId ?? selectedId;
        const spr = id ? nodeByIdRef.current.get(id) : null;

        gizmoLayer.removeChildren();
        app.stage.removeAllListeners("pointerup");
        app.stage.removeAllListeners("pointerupoutside");
        app.stage.removeAllListeners("pointermove");
        app.stage.removeAllListeners("globalpointermove");

        if (!editable || !spr || !id) return;

        const bboxG = new PIXI.Graphics();
        bboxG.zIndex = 10050;

        const HANDLE_PX = 16;
        const rotIcon = new PIXI.Sprite(getTex("/ui/tryon/handle-rotate.svg"));
        rotIcon.anchor.set(0.5);
        rotIcon.width = HANDLE_PX;
        rotIcon.height = HANDLE_PX;
        rotIcon.zIndex = 10052;
        rotIcon.eventMode = "none";

        const sclIcon = new PIXI.Sprite(getTex("/ui/tryon/handle-scale.svg"));
        sclIcon.anchor.set(0.5);
        sclIcon.width = HANDLE_PX;
        sclIcon.height = HANDLE_PX;
        sclIcon.zIndex = 10052;
        sclIcon.eventMode = "none";

        const rotHit = new PIXI.Graphics();
        rotHit.zIndex = 10053;
        rotHit.eventMode = "static";
        rotHit.cursor = "grab";
        rotHit.alpha = 0.001;

        const sclHit = new PIXI.Graphics();
        sclHit.zIndex = 10053;
        sclHit.eventMode = "static";
        sclHit.cursor = "nwse-resize";
        sclHit.alpha = 0.001;

        const updateGizmoVisuals = () => {
            const b = (spr as any).getBounds();
            bboxG.clear();
            bboxG.setStrokeStyle({ width: 2, color: 0x00c2ff, alpha: 0.95 });
            bboxG.rect(b.x, b.y, b.width, b.height);
            bboxG.stroke();

            const rotX = b.x + b.width / 2;
            const rotY = b.y - HANDLE_PX * 0.9;
            rotIcon.x = rotX; rotIcon.y = rotY;
            rotHit.clear(); rotHit.beginFill(0xffffff, 1);
            rotHit.circle(rotX, rotY, Math.max(12, HANDLE_PX * 0.75)); rotHit.endFill();

            const sclX = b.x + b.width + HANDLE_PX * 0.25;
            const sclY = b.y + b.height + HANDLE_PX * 0.25;
            sclIcon.x = sclX; sclIcon.y = sclY;
            sclHit.clear(); sclHit.beginFill(0xffffff, 1);
            sclHit.circle(sclX, sclY, Math.max(12, HANDLE_PX * 0.75)); sclHit.endFill();
        };
        updateGizmoVisuals();

        // DRAG
        let dragging = false;
        let dragOffset = { x: 0, y: 0 };
        (spr as any).eventMode = "static";
        (spr as any).cursor = "grab";
        (spr as any).removeAllListeners?.("pointerdown");
        (spr as any).on?.("pointerdown", (e: PIXI.FederatedPointerEvent) => {
            if (!editable) return;
            dragging = true;
            (spr as any).cursor = "grabbing";
            dragOffset = { x: (spr as any).x - e.global.x, y: (spr as any).y - e.global.y };
            e.stopPropagation();
        });
        if (startDragEv) {
            dragging = true;
            (spr as any).cursor = "grabbing";
            dragOffset = { x: (spr as any).x - startDragEv.global.x, y: (spr as any).y - startDragEv.global.y };
        }
        app.stage.on("pointerup", () => { if (dragging) { dragging = false; (spr as any).cursor = "grab"; commit(id); } });
        app.stage.on("pointerupoutside", () => { if (dragging) { dragging = false; (spr as any).cursor = "grab"; commit(id); } });
        app.stage.on("globalpointermove", (e: PIXI.FederatedPointerEvent) => {
            if (!dragging) return;
            (spr as any).x = e.global.x + dragOffset.x;
            (spr as any).y = e.global.y + dragOffset.y;
            updateGizmoVisuals();
        });

        // ROTATE
        let rotating = false;
        rotHit.on("pointerdown", (e) => { if (!editable) return; rotating = true; e.stopPropagation(); });
        app.stage.on("pointerup", () => { if (rotating) { rotating = false; commit(id); } });
        app.stage.on("pointerupoutside", () => { if (rotating) { rotating = false; commit(id); } });
        app.stage.on("globalpointermove", (e: PIXI.FederatedPointerEvent) => {
            if (!rotating) return;
            const b = (spr as any).getBounds();
            const cx = b.x + b.width / 2;
            const cy = b.y + b.height / 2;
            (spr as any).rotation = Math.atan2(e.global.y - cy, e.global.x - cx) + Math.PI / 2;
            updateGizmoVisuals();
        });

        // SCALE
        let scaling = false;
        const start = { x: 0, y: 0, s: 1 };
        sclHit.on("pointerdown", (e) => {
            if (!editable) return;
            scaling = true;
            start.x = e.global.x; start.y = e.global.y; start.s = (spr as any).scale.x;
            e.stopPropagation();
        });
        app.stage.on("pointerup", () => { if (scaling) { scaling = false; commit(id); } });
        app.stage.on("pointerupoutside", () => { if (scaling) { scaling = false; commit(id); } });
        app.stage.on("globalpointermove", (e: PIXI.FederatedPointerEvent) => {
            if (!scaling) return;
            const dx = e.global.x - start.x;
            const dy = e.global.y - start.y;
            const dist = Math.hypot(dx, dy);
            const sign = (spr as any).scale.x < 0 ? -1 : 1;
            const newS = Math.max(0.05, start.s + (dist / 300) * sign);
            (spr as any).scale.set(newS, newS);
            updateGizmoVisuals();
        });

        // wheel scaling
        (spr as any).removeAllListeners?.("wheel");
        (spr as any).on?.("wheel", (e: WheelEvent) => {
            if (!editable) return;
            const s = (spr as any).scale.x * (e.deltaY < 0 ? 1.06 : 1 / 1.06);
            const clamped = Math.max(0.05, Math.min(s, 6));
            (spr as any).scale.set(clamped, clamped);
            updateGizmoVisuals();
        });

        gizmoLayer.addChild(bboxG, rotHit, sclHit, rotIcon, sclIcon);
    };

    return (
        <div ref={hostRef} className="try-on-container" style={{ width: "100%", height: "100%", position: "relative" }} />
    );
}
