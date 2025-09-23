import React, { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { FRONT_V1, anchorForLayer } from "./anchors";

export type TryOnItem = {
    id: string;
    url: string; // empty string is skipped
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
        x: number;
        y: number;
        scale: number;
        rotationDeg: number;
        mesh?: { x: number; y: number }[];
    };
    z?: number;
};

export default function TryOnCanvas({
    mannequinUrl,
    poseId = "front_v1",
    items,
    responsive = true,
}: {
    mannequinUrl: string;
    poseId?: string;
    items: TryOnItem[];
    responsive?: boolean;
}) {
    const hostRef = useRef<HTMLDivElement>(null);
    const DEBUG_ANCHORS = true; // set true to visualize boxes
    const DEBUG_GRID = true; // cursor location

    useEffect(() => {
        const hostEl = hostRef.current;
        if (!hostEl) return;

        let destroyed = false;
        let app: PIXI.Application | null = null;

        (async () => {
            const localApp = new PIXI.Application();
            await localApp.init({
                backgroundAlpha: 0,
                antialias: true,
                resolution: Math.min(window.devicePixelRatio || 1, 2),
                ...(responsive ? { resizeTo: hostEl } : { width: 480, height: 720 }),
            });
            if (destroyed) { localApp.destroy(true); return; }

            // keep local refs; don't read from `app` after this
            app = localApp;
            const renderer = localApp.renderer;   // <-- use these
            const stage = localApp.stage;      // <--

            while (hostEl.firstChild) hostEl.removeChild(hostEl.firstChild);
            hostEl.appendChild(localApp.canvas as any);
            stage.sortableChildren = true;

            // preload
            const garmentUrls = items.map(i => i.url).filter(Boolean);
            await PIXI.Assets.load([mannequinUrl, ...garmentUrls]).catch(() => { });
            if (destroyed) return;

            // mannequin
            const manTex = PIXI.Texture.from(mannequinUrl);
            if (!manTex || manTex.width === 0 || manTex.height === 0) return;

            const mannequin = new PIXI.Sprite(manTex);
            mannequin.anchor.set(0.5, 0);
            const pad = 0.06;
            const sx = (renderer.width * (1 - pad)) / manTex.width;
            const sy = (renderer.height * (1 - pad)) / manTex.height;
            const manScale = Math.min(sx, sy);
            mannequin.scale.set(manScale);
            mannequin.x = renderer.width / 2;
            // bias slightly down (so there is extra headroom)
            const extraTop = 0.02 * renderer.height; // ~2% of canvas height
            mannequin.y = (renderer.height - manTex.height * manScale) * 0.5 + extraTop;
            mannequin.zIndex = 100;
            stage.addChild(mannequin);

            const manW = manTex.width * manScale;
            const manH = manTex.height * manScale;
            const toStageX = (nx: number) => mannequin.x + (nx - 0.5) * manW;
            const toStageY = (ny: number) => mannequin.y + ny * manH;
            const boxToStage = (b: { x: number; y: number; w: number; h: number }) => ({
                cx: toStageX(b.x + b.w / 2),
                cy: toStageY(b.y + b.h / 2),
                pw: b.w * manW,
                ph: b.h * manH,
            });

            const pose = FRONT_V1;

            if (DEBUG_ANCHORS) {
                const g = new PIXI.Graphics();
                g.zIndex = 9999;

                const draw = (b: { x: number; y: number; w: number; h: number }, color = 0x00ff88) => {
                    const cx = mannequin.x + (b.x * manW) - manW / 2;
                    const cy = mannequin.y + (b.y * manH);
                    const pw = b.w * manW;
                    const ph = b.h * manH;

                    g.setStrokeStyle({ width: 2, color, alpha: 0.9 });
                    g.rect(cx, cy, pw, ph);   // build path
                    g.stroke();               // stroke current path
                };

                draw(FRONT_V1.boxes.CHEST_BOX, 0x00aaff);
                draw(FRONT_V1.boxes.WAIST_BOX, 0xffaa00);
                draw(FRONT_V1.boxes.HIP_BOX, 0xff00aa);
                draw(FRONT_V1.boxes.LEFT_SHOE_BOX, 0x66ff66);
                draw(FRONT_V1.boxes.RIGHT_SHOE_BOX, 0x66ff66);

                stage.addChild(g);
            }

            // Helpers (stage->normalized) for cursor readout
            const fromStageNx = (sx: number) => ((sx - mannequin.x) / manW) + 0.5; // [-0.5..0.5] -> [0..1]
            const fromStageNy = (sy: number) => (sy - mannequin.y) / manH;         // [0..manH]  -> [0..1]

            // ===== Debug Grid =====
            if (DEBUG_GRID) {
                const grid = new PIXI.Graphics();
                grid.zIndex = 9998;

                // Draw grid in mannequin space
                const drawGrid = () => {
                    grid.clear();

                    // Outer border
                    grid.setStrokeStyle({ width: 2, color: 0x888888, alpha: 0.9 });
                    // rect(x,y,w,h) uses stage pixels
                    grid.rect(mannequin.x - manW / 2, mannequin.y + 0, manW, manH);
                    grid.stroke();

                    // Major/minor ticks every 0.10 / 0.05
                    const drawLine = (x1: number, y1: number, x2: number, y2: number, major = false) => {
                        grid.setStrokeStyle({ width: major ? 2 : 1, color: major ? 0x00aaff : 0xcccccc, alpha: major ? 0.9 : 0.6 });
                        grid.moveTo(x1, y1);
                        grid.lineTo(x2, y2);
                        grid.stroke();
                    };

                    for (let t = 0; t <= 1.0001; t += 0.05) {
                        const major = Math.abs((t * 100) % 10) < 1e-6;
                        // vertical at nx=t
                        const sx = toStageX(t);
                        drawLine(sx, mannequin.y, sx, mannequin.y + manH, major);

                        // horizontal at ny=t
                        const sy = toStageY(t);
                        drawLine(mannequin.x - manW / 2, sy, mannequin.x + manW / 2, sy, major);
                    }

                    // Labels (0, 0.5, 1) along axes
                    const mkLabel = (txt: string, x: number, y: number) => {
                        const label = new PIXI.Text({
                            text: txt,
                            style: { fill: 0x333333, fontSize: 12, align: "center" },
                        });
                        label.x = x;
                        label.y = y;
                        label.zIndex = 9999;
                        stage.addChild(label);
                        return label;
                    };

                    mkLabel("nx=0", toStageX(0) - 14, mannequin.y - 16);
                    mkLabel("nx=0.5", toStageX(0.5) - 18, mannequin.y - 16);
                    mkLabel("nx=1", toStageX(1) - 10, mannequin.y - 16);

                    mkLabel("ny=0", mannequin.x + manW / 2 + 6, toStageY(0) - 7);
                    mkLabel("ny=0.5", mannequin.x + manW / 2 + 6, toStageY(0.5) - 7);
                    mkLabel("ny=1", mannequin.x + manW / 2 + 6, toStageY(1) - 7);
                };

                drawGrid();
                stage.addChild(grid);

                // Crosshair + tooltip
                const cross = new PIXI.Graphics();
                cross.zIndex = 10000;
                stage.addChild(cross);

                const tip = new PIXI.Text({
                    text: "",
                    style: { fill: 0x111111, fontSize: 12, fontFamily: "monospace" },
                });
                tip.zIndex = 10001;
                stage.addChild(tip);

                // Enable pointer on whole stage
                stage.eventMode = "static";
                stage.hitArea = new PIXI.Rectangle(0, 0, renderer.width, renderer.height);

                stage.on("pointermove", (e: PIXI.FederatedPointerEvent) => {
                    const { x: sx, y: sy } = e.global;

                    // Convert to mannequin-normalized
                    const nx = Math.max(0, Math.min(1, fromStageNx(sx)));
                    const ny = Math.max(0, Math.min(1, fromStageNy(sy)));

                    // Only show crosshair when inside mannequin bounds
                    const inside =
                        sx >= mannequin.x - manW / 2 &&
                        sx <= mannequin.x + manW / 2 &&
                        sy >= mannequin.y &&
                        sy <= mannequin.y + manH;

                    cross.clear();
                    if (inside) {
                        cross.setStrokeStyle({ width: 1, color: 0xff3366, alpha: 0.85 });
                        // vertical
                        cross.moveTo(toStageX(nx), mannequin.y);
                        cross.lineTo(toStageX(nx), mannequin.y + manH);
                        cross.stroke();
                        // horizontal
                        cross.moveTo(mannequin.x - manW / 2, toStageY(ny));
                        cross.lineTo(mannequin.x + manW / 2, toStageY(ny));
                        cross.stroke();

                        tip.text = `nx=${nx.toFixed(3)}  ny=${ny.toFixed(3)}`;
                        tip.x = toStageX(nx) + 8;
                        tip.y = toStageY(ny) - 18;
                        tip.alpha = 1;
                    } else {
                        tip.alpha = 0.2;
                    }
                });
            }

            // garments
            [...items].filter(it => !!it.url).sort((a, b) => (a.z ?? 0) - (b.z ?? 0)).forEach(it => {
                const tex = PIXI.Texture.from(it.url);
                if (!tex || tex.width === 0 || tex.height === 0) return;

                if (it.layerCategory === "footwear") {
                    const lb = boxToStage(pose.boxes.LEFT_SHOE_BOX);
                    const rb = boxToStage(pose.boxes.RIGHT_SHOE_BOX);
                    const makeShoe = (b: typeof lb, mirrorX: boolean) => {
                        const spr = new PIXI.Sprite(tex);
                        spr.anchor.set(0.5);
                        spr.x = b.cx; spr.y = b.cy;
                        const base = Math.min(b.pw / tex.width, b.ph / tex.height);
                        let sx = base, sy = base;
                        if (it.fit) { spr.x += it.fit.x; spr.y += it.fit.y; sx *= it.fit.scale; sy *= it.fit.scale; spr.rotation = it.fit.rotationDeg * Math.PI / 180; }
                        spr.scale.set(mirrorX ? -sx : sx, sy);
                        spr.zIndex = it.z ?? 600;
                        stage.addChild(spr);
                    };
                    makeShoe(lb, false); makeShoe(rb, true);
                    return;
                }

                const node = new PIXI.Sprite(tex);
                node.anchor.set(0.5);
                const anchor = anchorForLayer(it.layerCategory, pose);
                const { cx, cy, pw, ph } = anchor ? boxToStage(anchor) : {
                    cx: renderer.width / 2, cy: renderer.height / 2, pw: manW * 0.3, ph: manH * 0.3,
                };
                let x = cx, y = cy, scale = Math.min(pw / tex.width, ph / tex.height);
                if (it.fit) { x += it.fit.x; y += it.fit.y; scale *= it.fit.scale; node.rotation = it.fit.rotationDeg * Math.PI / 180; }
                node.x = x; node.y = y; node.scale.set(scale);
                node.zIndex = it.z ?? 500;
                stage.addChild(node);
            });
        })();



        return () => {
            destroyed = true;
            if (app) { app.destroy(true); app = null; }
            if (hostEl.firstChild) { try { hostEl.removeChild(hostEl.firstChild); } catch { } }
        };
    }, [mannequinUrl, items, poseId, responsive]);



    return <div ref={hostRef} style={{ width: "100%", height: 600 }} />;
}