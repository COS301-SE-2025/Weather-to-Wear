import React, { useEffect, useState } from "react";
import TryOnCanvas, { TryOnItem } from "./TryOnCanvas";
import { getItemFits } from "../../services/tryonApi";
import { cdnUrlFor } from "../../utils/cdn";

export default function TryOnViewer({
    mannequinUrl,
    poseId = "front_v1",
    outfitItems,
}: {
    mannequinUrl: string;
    poseId?: string;
    outfitItems: {
        closetItemId: string;
        urlKey?: string;        // storage key if you have it
        imageUrl?: string;      // absolute or relative image URL if that's what you have
        layerCategory: TryOnItem["layerCategory"];
    }[];
}) {
    const [items, setItems] = useState<TryOnItem[]>([]);

    useEffect(() => {
        const ids = outfitItems.map(o => o.closetItemId);
        getItemFits(poseId, ids).then(({ fits }) => {
            const byId: Record<string, any> = {};
            fits.forEach((f: any) => { byId[f.itemId] = f; });
            const mapped: TryOnItem[] = outfitItems.map(o => {
                // Prefer urlKey (S3/CDN key); else fallback to an existing imageUrl.
                // cdnUrlFor always returns a string (possibly empty), so it's safe for typing.
                const raw = o.urlKey ?? o.imageUrl ?? "";
                const url = cdnUrlFor(raw);
                const fit = byId[o.closetItemId]
                    ? {
                        x: byId[o.closetItemId].transform.x,
                        y: byId[o.closetItemId].transform.y,
                        scale: byId[o.closetItemId].transform.scale,
                        rotationDeg: byId[o.closetItemId].transform.rotationDeg,
                        mesh: byId[o.closetItemId].mesh,
                    }
                    : undefined;
                return {
                    id: o.closetItemId,
                    url,
                    layerCategory: o.layerCategory,
                    fit,
                };
            });
            setItems(mapped);
        }).catch(() => {
            const mapped: TryOnItem[] = outfitItems.map(o => ({
                id: o.closetItemId,
                url: cdnUrlFor(o.urlKey ?? o.imageUrl ?? ""),
                layerCategory: o.layerCategory,
            }));
            setItems(mapped);
        });
    }, [poseId, JSON.stringify(outfitItems)]);

    return (
        <div className="try-on-container" style={{
            width: "100%",
            height: "100%",
            minHeight: "400px",
            position: "relative"
        }}>
            <TryOnCanvas
                mannequinUrl={mannequinUrl}
                poseId={poseId}
                items={items}
            />
        </div>
    );
}
