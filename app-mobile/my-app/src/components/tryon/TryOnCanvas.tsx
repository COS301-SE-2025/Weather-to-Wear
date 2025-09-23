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

    useEffect(() => {
        const hostEl = hostRef.current; // capture stable ref for cleanup
        if (!hostEl) return;

        let destroyed = false;
        let app: PIXI.Application | null = null;

        (async () => {
            // 1) Init app (v8 style)
            const localApp = new PIXI.Application();
            await localApp.init({
                backgroundAlpha: 0,
                antialias: true,
                ...(responsive ? { resizeTo: hostEl } : { width: 480, height: 720 }),
            });
            if (destroyed) {
                localApp.destroy(true);
                return;
            }
            app = localApp;

            // Mount canvas (v8 uses .canvas)
            while (hostEl.firstChild) hostEl.removeChild(hostEl.firstChild);
            hostEl.appendChild(app.canvas as any);
            app.stage.sortableChildren = true;

            // 2) Preload all assets (mannequin + garment images)
            const garmentUrls = items.map((it) => it.url).filter(Boolean);
            const uniqueUrls = Array.from(new Set([mannequinUrl, ...garmentUrls]));
            try {
                await PIXI.Assets.load(uniqueUrls);
            } catch (e) {
                // If one fails, keep going; failing textures will just be skipped below
                // eslint-disable-next-line no-console
                console.warn("[TryOnCanvas] Some assets failed to load:", e);
            }
            if (destroyed) return;

            // 3) Helpers after we know renderer size
            const pose = FRONT_V1;
            const nx = (x: number) => x * app!.renderer.width;
            const ny = (y: number) => y * app!.renderer.height;

            // 4) Mannequin
            const mannequinTex = PIXI.Texture.from(mannequinUrl);
            if (mannequinTex && mannequinTex.width > 0 && mannequinTex.height > 0) {
                const mannequin = new PIXI.Sprite(mannequinTex);
                mannequin.anchor.set(0.5, 0);
                mannequin.x = app!.renderer.width / 2;
                mannequin.y = 0;
                mannequin.zIndex = 100;
                app!.stage.addChild(mannequin);
            } else {
                console.warn("[TryOnCanvas] Mannequin texture not valid:", mannequinUrl);
            }

            // 5) Garments
            [...items]
                .filter((it) => !!it.url)
                .sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
                .forEach((it) => {
                    const tex = PIXI.Texture.from(it.url);
                    // Skip invalid / failed-to-load textures gracefully
                    if (!tex || tex.width === 0 || tex.height === 0) return;

                    if (it.layerCategory === "footwear") {
                        const lb = pose.boxes.LEFT_SHOE_BOX;
                        const rb = pose.boxes.RIGHT_SHOE_BOX;

                        const makeShoe = (box: any, mirrorX: boolean) => {
                            const spr = new PIXI.Sprite(tex);
                            spr.anchor.set(0.5);
                            spr.x = nx(box.x + box.w / 2);
                            spr.y = ny(box.y + box.h / 2);

                            // Base scale to fit inside box
                            const sw = nx(box.w) / tex.width;
                            const sh = ny(box.h) / tex.height;
                            const baseScale = Math.min(sw, sh);

                            let scaleX = baseScale;
                            let scaleY = baseScale;

                            if (it.fit) {
                                spr.x += it.fit.x;
                                spr.y += it.fit.y;
                                scaleX *= it.fit.scale;
                                scaleY *= it.fit.scale;
                                spr.rotation = (it.fit.rotationDeg * Math.PI) / 180;
                            }

                            spr.scale.set(mirrorX ? -scaleX : scaleX, scaleY);
                            spr.zIndex = it.z ?? 600;
                            app!.stage.addChild(spr);
                        };

                        makeShoe(lb, false);
                        makeShoe(rb, true);
                        return;
                    }

                    // Other layers
                    const node = new PIXI.Sprite(tex);
                    node.anchor.set(0.5);

                    const box: any = anchorForLayer(it.layerCategory, pose);
                    let x = box ? nx(box.x + box.w / 2) : app!.renderer.width / 2;
                    let y = box ? ny(box.y + box.h / 2) : app!.renderer.height / 2;

                    // Auto scale to box
                    let scale = 1;
                    if (box) {
                        const sw = nx(box.w) / tex.width;
                        const sh = ny(box.h) / tex.height;
                        scale = Math.min(sw, sh);
                    }

                    if (it.fit) {
                        x += it.fit.x;
                        y += it.fit.y;
                        scale *= it.fit.scale;
                        node.rotation = (it.fit.rotationDeg * Math.PI) / 180;
                    }

                    node.x = x;
                    node.y = y;
                    node.scale.set(scale);
                    node.zIndex = it.z ?? 500;
                    app!.stage.addChild(node);

                    // TODO: Mesh warp later using it.fit.mesh with PIXI.SimpleMesh
                });
        })();

        // Cleanup
        return () => {
            destroyed = true;
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
        // Dependencies: rerender when mannequin, items, pose, or responsive changes.
    }, [mannequinUrl, items, poseId, responsive]);

    return <div ref={hostRef} style={{ width: "100%", height: "600px" }} />;
}
