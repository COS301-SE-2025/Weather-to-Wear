import React, { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import { FRONT_V1, anchorForLayer } from "./anchors";

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

export default function TryOnCanvas({
    mannequinUrl,
    poseId = "front_v1",
    items,
    responsive = true,
    editable = false,
    onChangeFit,
}: {
    mannequinUrl: string;
    poseId?: string;
    items: TryOnItem[];
    responsive?: boolean;
    editable?: boolean;
    onChangeFit?: (itemId: string, transform: FitTransform) => void;
}) {
    const hostRef = useRef<HTMLDivElement>(null);

    const DEBUG_ANCHORS = false;
    const DEBUG_GRID = false;

    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        const hostEl = hostRef.current;
        if (!hostEl) return;

        let destroyed = false;
        let app: PIXI.Application | null = null;
        let mannequin: PIXI.Sprite | null = null;
        let manW = 0;
        let manH = 0;

        const nodeById = new Map<string, PIXI.Sprite>();
        const spriteInfo = new Map<
            string,
            {
                baseScale: number;
                anchorCenter: { x: number; y: number };
                stageX: number;
                stageY: number;
                stageScale: number;
                stageRotation: number;
            }
        >();

        const overlay = new PIXI.Container();   // occluder
        const gizmoLayer = new PIXI.Container(); // selection handles

        const rad = (deg: number) => (deg * Math.PI) / 180;

        const ensureNormalized = (x: number, y: number) => {
            const absMax = Math.max(Math.abs(x), Math.abs(y));
            if (absMax <= 2) return { nx: x, ny: y };
            return { nx: x / Math.max(1, manW), ny: y / Math.max(1, manH) };
        };

        // forward declaration so we can start drag from initial click
        let drawGizmo: (forcedId?: string, startDragEv?: PIXI.FederatedPointerEvent) => void;

        const layoutAll = () => {
            if (destroyed || !app || !mannequin) return;
            const stage = app.stage;
            const renderer = app.renderer;
            const pose = FRONT_V1;

            const toStageX = (nx: number) => mannequin!.x + (nx - 0.5) * manW;
            const toStageY = (ny: number) => mannequin!.y + (ny - 0.5) * manH;
            const boxToStage = (b: { x: number; y: number; w: number; h: number }) => ({
                cx: toStageX(b.x + b.w / 2),
                cy: toStageY(b.y + b.h / 2),
                pw: b.w * manW,
                ph: b.h * manH,
            });

            // garments (non-footwear)
            items
                .filter((it) => !!it.url && it.layerCategory !== "footwear")
                .forEach((it) => {
                    const tex = PIXI.Texture.from(it.url);
                    if (!tex || tex.width === 0 || tex.height === 0) return;

                    let node = nodeById.get(it.id);
                    if (!node) {
                        node = new PIXI.Sprite(tex);
                        node.anchor.set(0.5);
                        node.name = it.id;
                        stage.addChild(node);
                        nodeById.set(it.id, node);

                        // selection — also start drag on this very event
                        node.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
                            if (!editable) return;
                            e.stopPropagation();
                            setSelectedId(it.id);
                            drawGizmo(it.id, e); // start dragging from this first click
                        });
                    }

                    // keep interactivity synced to `editable`
                    node.eventMode = editable ? "static" : "none";
                    node.cursor = editable ? "grab" : "default";
                    node.zIndex = it.z ?? (it.layerCategory === "headwear" ? 650 : 500);

                    const anchor = anchorForLayer(it.layerCategory, pose);
                    const { cx, cy, pw, ph } = anchor
                        ? boxToStage(anchor)
                        : { cx: renderer.width / 2, cy: renderer.height / 2, pw: manW * 0.3, ph: manH * 0.3 };

                    const baseScale = Math.min(pw / tex.width, ph / tex.height);

                    const fit = it.fit;
                    const norm =
                        fit && typeof fit.x === "number" && typeof fit.y === "number"
                            ? ensureNormalized(fit.x, fit.y)
                            : { nx: 0, ny: 0 };

                    const offsetX = norm.nx * manW;
                    const offsetY = norm.ny * manH;
                    const scl = (fit?.scale ?? 1) * baseScale;
                    const rot = rad(fit?.rotationDeg ?? 0);

                    node.x = cx + offsetX;
                    node.y = cy + offsetY;
                    node.scale.set(scl);
                    node.rotation = rot;

                    spriteInfo.set(it.id, {
                        baseScale,
                        anchorCenter: { x: cx, y: cy },
                        stageX: node.x,
                        stageY: node.y,
                        stageScale: scl,
                        stageRotation: rot,
                    });
                });

            // footwear mirrored (view-only here)
            items
                .filter((i) => i.layerCategory === "footwear" && !!i.url)
                .forEach((it) => {
                    const tex = PIXI.Texture.from(it.url);
                    if (!tex || tex.width === 0 || tex.height === 0) return;
                    const lb = boxToStage(pose.boxes.LEFT_SHOE_BOX);
                    const rb = boxToStage(pose.boxes.RIGHT_SHOE_BOX);

                    const place = (b: typeof lb, mirrorX: boolean, key: string) => {
                        let spr = nodeById.get(key) as PIXI.Sprite | undefined;
                        if (!spr) {
                            spr = new PIXI.Sprite(tex);
                            spr.anchor.set(0.5);
                            spr.name = key;
                            stage.addChild(spr);
                            nodeById.set(key, spr);
                        }
                        spr.eventMode = "none";
                        spr.cursor = "default";
                        spr.zIndex = it.z ?? 600;

                        spr.x = b.cx;
                        spr.y = b.cy;
                        const base = Math.min(b.pw / tex.width, b.ph / tex.height);
                        let s = base;
                        let rot = 0;
                        if (it.fit) {
                            const norm = ensureNormalized(it.fit.x ?? 0, it.fit.y ?? 0);
                            spr.x += norm.nx * manW;
                            spr.y += norm.ny * manH;
                            s *= it.fit.scale ?? 1;
                            rot = rad(it.fit.rotationDeg ?? 0);
                        }
                        spr.scale.set(mirrorX ? -s : s, s);
                        spr.rotation = rot;
                    };

                    place(lb, false, `${it.id}|L`);
                    place(rb, true, `${it.id}|R`);
                });

            // occlusion overlay
            if (!overlay.parent) {
                overlay.zIndex = 550;
                stage.addChild(overlay);
            }
            overlay.removeChildren();
            try {
                const occTex = PIXI.Texture.from("/mannequins/front_v1_forearms.png");
                if (occTex && occTex.width > 0 && occTex.height > 0) {
                    const occ = new PIXI.Sprite(occTex);
                    occ.anchor.set(0.5);
                    occ.x = mannequin!.x;
                    occ.y = mannequin!.y;
                    occ.scale.set(mannequin!.scale.x);
                    occ.eventMode = "none";
                    overlay.addChild(occ);
                }
            } catch { }

            // refresh gizmo if already selected
            drawGizmo(selectedId ?? undefined, undefined);
        };

        drawGizmo = (forcedId?: string, startDragEv?: PIXI.FederatedPointerEvent) => {
            if (destroyed || !app) return;

            const stage = app.stage;
            const id = forcedId ?? selectedId;
            const spr = id ? nodeById.get(id) : null;

            gizmoLayer.removeChildren();
            // rebind stage listeners ONLY when (re)drawing the gizmo (i.e., on select/layout)
            stage.removeAllListeners("pointerup");
            stage.removeAllListeners("pointerupoutside");
            stage.removeAllListeners("pointermove");

            if (!editable || !spr || !id) return;

            // --- visuals (bbox + handles) ---
            const g = new PIXI.Graphics();
            g.zIndex = 10050;
            const rotHandle = new PIXI.Graphics();
            rotHandle.zIndex = 10051;
            const sclHandle = new PIXI.Graphics();
            sclHandle.zIndex = 10051;

            const updateGizmoVisuals = () => {
                // bbox
                g.clear();
                g.setStrokeStyle({ width: 2, color: 0x00c2ff, alpha: 0.95 });
                const cornersLocal = [
                    new PIXI.Point(-spr.width / 2, -spr.height / 2),
                    new PIXI.Point(spr.width / 2, -spr.height / 2),
                    new PIXI.Point(spr.width / 2, spr.height / 2),
                    new PIXI.Point(-spr.width / 2, spr.height / 2),
                ];
                const world = cornersLocal.map((p) => spr.toGlobal(p));
                g.moveTo(world[0].x, world[0].y);
                for (let i = 1; i < world.length; i++) g.lineTo(world[i].x, world[i].y);
                g.closePath();
                g.stroke();

                // rotate handle above top edge
                rotHandle.clear();
                rotHandle.setStrokeStyle({ width: 2, color: 0x00c2ff, alpha: 0.95 });
                const topWorld = spr.toGlobal(new PIXI.Point(0, -spr.height / 2));
                rotHandle.circle(topWorld.x, topWorld.y - 24, 9);
                rotHandle.stroke();
                rotHandle.eventMode = "static";
                rotHandle.cursor = "grab";

                // scale handle bottom-right
                sclHandle.clear();
                sclHandle.setStrokeStyle({ width: 2, color: 0x00c2ff, alpha: 0.95 });
                const rbWorld = spr.toGlobal(new PIXI.Point(spr.width / 2, spr.height / 2));
                sclHandle.rect(rbWorld.x - 8, rbWorld.y - 8, 16, 16);
                sclHandle.stroke();
                sclHandle.eventMode = "static";
                sclHandle.cursor = "nwse-resize";
            };

            updateGizmoVisuals();

            // --- interactions (do NOT recreate during move) ---
            // DRAG
            let dragging = false;
            let dragOffset = { x: 0, y: 0 };

            spr.eventMode = "static";
            spr.cursor = "grab";
            spr.removeAllListeners("pointerdown");
            spr.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
                if (!editable) return;
                dragging = true;
                spr.cursor = "grabbing";
                dragOffset = { x: spr.x - e.global.x, y: spr.y - e.global.y };
                e.stopPropagation();
            });

            // If selection originated from a sprite click, begin that drag immediately
            if (startDragEv) {
                dragging = true;
                spr.cursor = "grabbing";
                dragOffset = { x: spr.x - startDragEv.global.x, y: spr.y - startDragEv.global.y };
            }

            stage.on("pointerup", () => {
                if (dragging) {
                    dragging = false;
                    spr.cursor = "grab";
                    commit(id);
                }
            });
            stage.on("pointerupoutside", () => {
                if (dragging) {
                    dragging = false;
                    spr.cursor = "grab";
                    commit(id);
                }
            });
            stage.on("pointermove", (e: PIXI.FederatedPointerEvent) => {
                if (!dragging) return;
                spr.x = e.global.x + dragOffset.x;
                spr.y = e.global.y + dragOffset.y;
                updateGizmoVisuals(); // just redraw graphics, keep handlers intact
            });

            // ROTATE
            let rotating = false;
            rotHandle.on("pointerdown", (e) => {
                if (!editable) return;
                rotating = true;
                e.stopPropagation();
            });
            stage.on("pointerup", () => {
                if (rotating) {
                    rotating = false;
                    commit(id);
                }
            });
            stage.on("pointerupoutside", () => {
                if (rotating) {
                    rotating = false;
                    commit(id);
                }
            });
            stage.on("pointermove", (e: PIXI.FederatedPointerEvent) => {
                if (!rotating) return;
                const ang = Math.atan2(e.global.y - spr.y, e.global.x - spr.x) + Math.PI / 2;
                spr.rotation = ang;
                updateGizmoVisuals();
            });

            // SCALE
            let scaling = false;
            const start = { x: 0, y: 0, s: 1 };
            sclHandle.on("pointerdown", (e) => {
                if (!editable) return;
                scaling = true;
                start.x = e.global.x;
                start.y = e.global.y;
                start.s = spr.scale.x;
                e.stopPropagation();
            });
            stage.on("pointerup", () => {
                if (scaling) {
                    scaling = false;
                    commit(id);
                }
            });
            stage.on("pointerupoutside", () => {
                if (scaling) {
                    scaling = false;
                    commit(id);
                }
            });
            stage.on("pointermove", (e: PIXI.FederatedPointerEvent) => {
                if (!scaling) return;
                const dx = e.global.x - start.x;
                const dy = e.global.y - start.y;
                const dist = Math.hypot(dx, dy);
                const sign = spr.scale.x < 0 ? -1 : 1;
                const newS = Math.max(0.05, start.s + (dist / 300) * sign);
                spr.scale.set(newS, newS);
                updateGizmoVisuals();
            });

            // WHEEL scale
            spr.removeAllListeners("wheel");
            spr.on("wheel", (e: WheelEvent) => {
                if (!editable) return;
                const s = spr.scale.x * (e.deltaY < 0 ? 1.06 : 1 / 1.06);
                const clamped = Math.max(0.05, Math.min(s, 6));
                spr.scale.set(clamped, clamped);
                updateGizmoVisuals();
            });

            gizmoLayer.addChild(g, rotHandle, sclHandle);
        };

        const commit = (id: string) => {
            if (destroyed || !app || !onChangeFit) return;
            const spr = nodeById.get(id);
            const info = spriteInfo.get(id);
            if (!spr || !info || !mannequin) return;

            const dx = spr.x - info.anchorCenter.x;
            const dy = spr.y - info.anchorCenter.y;
            const nx = dx / Math.max(1, manW);
            const ny = dy / Math.max(1, manH);
            const relScale = spr.scale.x / Math.max(1e-6, info.baseScale);
            const rotationDeg = (spr.rotation * 180) / Math.PI;

            onChangeFit(id, { x: nx, y: ny, scale: relScale, rotationDeg });
        };

        const setStageHitArea = () => {
            if (!app) return;
            const stage = app.stage;
            const r = app.renderer;
            stage.eventMode = "static";
            stage.hitArea = new PIXI.Rectangle(0, 0, r.width, r.height);
            // Deselect when clicking empty space (sprite handlers call stopPropagation)
            stage.removeAllListeners("pointerdown");
            stage.on("pointerdown", () => {
                if (!editable) return;
                setSelectedId(null);
                gizmoLayer.removeChildren();
            });
        };

        const handleResize = () => {
            if (destroyed || !app || !mannequin) return;
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

            manW = manTex.width * manScale;
            manH = manTex.height * manScale;

            layoutAll();
        };

        (async () => {
            const localApp = new PIXI.Application();
            await localApp.init({
                backgroundAlpha: 0,
                antialias: true,
                resolution: Math.min(window.devicePixelRatio || 1, 2),
            });
            if (destroyed) {
                localApp.destroy(true);
                return;
            }

            app = localApp;
            const renderer = localApp.renderer;
            const stage = localApp.stage;
            stage.sortableChildren = true;

            const containerWidth = hostEl.clientWidth;
            const containerHeight = hostEl.clientHeight;
            renderer.resize(containerWidth, containerHeight);

            (localApp.canvas as HTMLCanvasElement).classList.add("mannequin-canvas");
            while (hostEl.firstChild) hostEl.removeChild(hostEl.firstChild);
            hostEl.appendChild(localApp.canvas as any);

            setStageHitArea();

            // preload
            const garmentUrls = items.map((i) => i.url).filter(Boolean);
            const queue = [mannequinUrl, ...garmentUrls, "/mannequins/front_v1_forearms.png"];
            await PIXI.Assets.load(queue).catch(() => { });

            // mannequin
            const manTex = PIXI.Texture.from(mannequinUrl);
            if (!manTex || manTex.width === 0 || manTex.height === 0) return;

            mannequin = new PIXI.Sprite(manTex);
            mannequin.anchor.set(0.5, 0.5);

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

            mannequin.x = containerWidth / 2;
            mannequin.y = containerHeight / 2;
            mannequin.zIndex = 100;
            stage.addChild(mannequin);

            manW = manTex.width * manScale;
            manH = manTex.height * manScale;







            // debug anchors/grid (kept from your original)
            if (DEBUG_ANCHORS) {
                const pose = FRONT_V1;
                const g = new PIXI.Graphics();
                g.zIndex = 9999;

                const toStageX = (nx: number) => mannequin!.x + (nx - 0.5) * manW;
                const toStageY = (ny: number) => mannequin!.y + (ny - 0.5) * manH;
                const boxToStage = (b: { x: number; y: number; w: number; h: number }) => ({
                    cx: toStageX(b.x + b.w / 2),
                    cy: toStageY(b.y + b.h / 2),
                    pw: b.w * manW,
                    ph: b.h * manH,
                });

                const draw = (b: { x: number; y: number; w: number; h: number }, color = 0x00ff88) => {
                    const { cx, cy, pw, ph } = boxToStage(b);
                    g.setStrokeStyle({ width: 2, color, alpha: 0.9 });
                    g.rect(cx - pw / 2, cy - ph / 2, pw, ph);
                    g.stroke();
                };

                draw(FRONT_V1.boxes.CHEST_BOX, 0x00aaff);
                draw(FRONT_V1.boxes.WAIST_BOX, 0xffaa00);
                draw(FRONT_V1.boxes.HIP_BOX, 0xff00aa);
                draw(FRONT_V1.boxes.LEFT_SHOE_BOX, 0x66ff66);
                draw(FRONT_V1.boxes.RIGHT_SHOE_BOX, 0x66ff66);

                stage.addChild(g);
            }

            // DEBUG GRID + cursor readout
            if (DEBUG_GRID) {
                const toStageX = (nx: number) => mannequin!.x + (nx - 0.5) * manW;
                const toStageY = (ny: number) => mannequin!.y + (ny - 0.5) * manH;

                const fromStageNx = (sx: number) => (sx - mannequin!.x) / Math.max(1, manW) + 0.5;
                const fromStageNy = (sy: number) => (sy - mannequin!.y) / Math.max(1, manH) + 0.5;

                const grid = new PIXI.Graphics();
                grid.zIndex = 9998;

                const drawGrid = () => {
                    grid.clear();

                    // border
                    grid.setStrokeStyle({ width: 2, color: 0x888888, alpha: 0.9 });
                    grid.rect(mannequin!.x - manW / 2, mannequin!.y - manH / 2, manW, manH);
                    grid.stroke();

                    const drawLine = (
                        x1: number,
                        y1: number,
                        x2: number,
                        y2: number,
                        major = false
                    ) => {
                        grid.setStrokeStyle({
                            width: major ? 2 : 1,
                            color: major ? 0x00aaff : 0xcccccc,
                            alpha: major ? 0.9 : 0.6,
                        });
                        grid.moveTo(x1, y1);
                        grid.lineTo(x2, y2);
                        grid.stroke();
                    };

                    for (let t = 0; t <= 1.0001; t += 0.05) {
                        const major = Math.abs((t * 100) % 10) < 1e-6;
                        const sx = toStageX(t);
                        drawLine(sx, mannequin!.y - manH / 2, sx, mannequin!.y + manH / 2, major);
                        const sy = toStageY(t);
                        drawLine(mannequin!.x - manW / 2, sy, mannequin!.x + manW / 2, sy, major);
                    }
                };

                drawGrid();
                stage.addChild(grid);

                const tip = new PIXI.Text({
                    text: "",
                    style: { fill: 0x111111, fontSize: 12, fontFamily: "monospace" },
                });
                tip.zIndex = 10001;
                stage.addChild(tip);

                stage.eventMode = "static";
                stage.hitArea = new PIXI.Rectangle(0, 0, renderer.width, renderer.height);

                stage.on("pointermove", (e: PIXI.FederatedPointerEvent) => {
                    const { x: sx, y: sy } = e.global;

                    const nx = Math.max(0, Math.min(1, fromStageNx(sx)));
                    const ny = Math.max(0, Math.min(1, fromStageNy(sy)));

                    const inside =
                        sx >= mannequin!.x - manW / 2 &&
                        sx <= mannequin!.x + manW / 2 &&
                        sy >= mannequin!.y - manH / 2 &&
                        sy <= mannequin!.y + manH / 2;

                    if (inside) {
                        tip.text = `nx=${nx.toFixed(3)}  ny=${ny.toFixed(3)}`;
                        tip.x = toStageX(nx) + 8;
                        tip.y = toStageY(ny) - 18;
                        tip.alpha = 1;
                    } else {
                        tip.alpha = 0.2;
                    }
                });
            }








            gizmoLayer.zIndex = 10060;
            stage.addChild(gizmoLayer);

            layoutAll();

            setTimeout(() => {
                if (!destroyed) handleResize();
            }, 100);
        })();

        const resizeObserver = new ResizeObserver(() => {
            if (!destroyed && responsive) handleResize();
        });
        resizeObserver.observe(hostEl);

        return () => {
            destroyed = true;
            resizeObserver.disconnect();
            try {
                app?.stage?.removeAllListeners();
            } catch { }
            if (app) {
                app.destroy(true);
                app = null;
            }
            if (hostEl.firstChild) {
                try {
                    hostEl.removeChild(hostEl.firstChild);
                } catch { }
            }
        };
    }, [mannequinUrl, items, poseId, responsive, editable, onChangeFit]);

    return (
        <div
            ref={hostRef}
            className="try-on-container"
            style={{ width: "100%", height: "100%", position: "relative" }}
        />
    );
}