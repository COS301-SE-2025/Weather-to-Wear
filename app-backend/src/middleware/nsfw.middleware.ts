// src/middleware/nsfw.middleware.ts
import type { Request, Response, NextFunction, RequestHandler } from "express";
import fs from "fs";
import { seCheckImageFromUrl, seCheckImageUpload, seCheckText } from "../utils/sightengine";

type Action = "ALLOW" | "REVIEW" | "BLOCK";

const I_BLOCK = parseFloat(process.env.NSFW_IMAGE_BLOCK || "0.70");  
const I_REVIEW = parseFloat(process.env.NSFW_IMAGE_REVIEW || "0.50"); // Lower threshold = stricter
const T_BLOCK = parseFloat(process.env.NSFW_TEXT_BLOCK || "0.60");  
const T_REVIEW = parseFloat(process.env.NSFW_TEXT_REVIEW || "0.50"); 


function respond(res: Response, result: { action: Action; label: string; scores: any }): boolean {
    if (result.action === "BLOCK") {
        res.status(400).json({ error: "NSFW_BLOCKED", label: result.label, scores: result.scores });
        return true;
    }
    if (result.action === "REVIEW") {
        res.status(202).json({ status: "PENDING_REVIEW", label: result.label, scores: result.scores });
        return true;
    }
    return false;
}

function decideImage(se: any) {
    const n = se?.nudity || {};
    const explicit = Math.max(n.sexual_activity ?? 0, n.sexual_display ?? 0, n.erotica ?? 0);
    const suggestive = Math.max(n.very_suggestive ?? 0, n.suggestive ?? 0, n.mildly_suggestive ?? 0);
    const off = se?.offensive || {};
    const offensive_any = Math.max(off.prob ?? 0, off.nsfc ?? 0);

    if (explicit >= I_BLOCK) return { action: "BLOCK" as Action, label: "EXPLICIT_IMAGE", scores: { explicit, suggestive, offensive_any } };
    if (explicit >= I_REVIEW || suggestive >= I_REVIEW || offensive_any >= I_REVIEW) {
        return { action: "REVIEW" as Action, label: "SUGGESTIVE_OR_OFFENSIVE_IMAGE", scores: { explicit, suggestive, offensive_any } };
    }
    return { action: "ALLOW" as Action, label: "SAFE_IMAGE", scores: { explicit, suggestive, offensive_any } };
}

function decideText(se: any) {
  // --- ML scores (Sightengine text) ---
  const ml = se?.moderation_classes ?? {};
  const sexual         = Number(ml.sexual ?? 0);
  const discriminatory = Number(ml.discriminatory ?? ml.hate ?? 0);
  const insulting      = Number(ml.insulting ?? ml.insult ?? 0);
  const violent        = Number(ml.violent ?? 0);
  const toxic          = Number(ml.toxic ?? 0);

  // --- Rules / matches (section-specific) ---
  // Profanity: se.profanity.matches = [{ type: 'inappropriate', intensity: 'high', match: '...' }]
  const profanityMatches = Array.isArray(se?.profanity?.matches) ? se.profanity.matches : [];
  const hasProfanity = profanityMatches.length > 0;

  // Sexual rules: some accounts expose section names like "sexual" or "sexual_minors"
  // If your account returns them elsewhere, add here similarly.
  const sexualSectionMatches = Array.isArray(se?.sexual?.matches) ? se.sexual.matches : [];
  const sexualMinorsMatches  = Array.isArray(se?.sexual_minors?.matches) ? se.sexual_minors.matches : [];

  // Zero tolerance for sexual content involving minors
  if (sexualMinorsMatches.length > 0) {
    return {
      action: "BLOCK" as Action,
      label: "SEXUAL_MINORS_TEXT",
      scores: { sexual, insulting, toxic, discriminatory, violent, hasProfanity, sexualMinorsMatches: sexualMinorsMatches.length }
    };
  }

  // Strong ML signals → BLOCK
  if (
    sexual >= T_BLOCK ||
    insulting >= T_BLOCK ||
    toxic >= T_BLOCK ||
    discriminatory >= T_BLOCK
  ) {
    return {
      action: "BLOCK" as Action,
      label: "SEXUAL_OR_TOXIC_TEXT",
      scores: { sexual, insulting, toxic, discriminatory, violent, hasProfanity }
    };
  }

  // Policy for profanity: block instead of just reviewing
  if (hasProfanity) {
    return {
      action: "BLOCK" as Action,         // Changed from REVIEW to BLOCK
      label: "PROFANITY_TEXT",
      scores: { sexual, insulting, toxic, discriminatory, violent, profanityMatches: profanityMatches.length }
    };
  }

  // Sexual rule hits without high ML → REVIEW
  if (sexualSectionMatches.length > 0) {
    return {
      action: "REVIEW" as Action,
      label: "POSSIBLE_SEXUAL_TEXT",
      scores: { sexual, insulting, toxic, discriminatory, violent, sexualSectionMatches: sexualSectionMatches.length }
    };
  }

  // Medium ML scores → REVIEW
  if (
    sexual >= T_REVIEW ||
    insulting >= T_REVIEW ||
    toxic >= T_REVIEW ||
    discriminatory >= T_REVIEW
  ) {
    return {
      action: "REVIEW" as Action,
      label: "POSSIBLY_NSFW_TEXT",
      scores: { sexual, insulting, toxic, discriminatory, violent }
    };
  }

  return {
    action: "ALLOW" as Action,
    label: "SAFE_TEXT",
    scores: { sexual, insulting, toxic, discriminatory, violent }
  };
}



export function nsfwText(field = "text"): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const value = (req.body?.[field] ?? "").toString();
            if (!value.trim()) { next(); return; }
            
            
            // Check if Sightengine credentials are configured
            if (!process.env.SIGHTENGINE_API_USER || !process.env.SIGHTENGINE_API_SECRET) {
                console.warn('NSFW middleware: Sightengine API credentials not configured, using basic filtering only');
                // Continue with just the basic profanity check we already did
                next();
                return;
            }
            
            try {
                const se = await seCheckText(value);
                const decision = decideText(se);
                if (respond(res, decision)) return;
                (req as any).moderation = { ...(req as any).moderation, [field]: decision };
            } catch (seError: any) {
                // Log the error but allow the request to proceed since we already did basic filtering
                console.error('NSFW text check failed:', seError?.message || seError);
                console.warn('NSFW middleware: Using only basic profanity filtering due to API error');
                // We already checked for basic profanity, so we can proceed
                next();
                return;
            }
            
            next();
        } catch (e: any) {
            console.error('Unexpected error in nsfwText middleware:', e);
            // Allow the request to proceed rather than blocking everything
            console.warn('NSFW middleware: Allowing request despite error in text filtering');
            next();
        }
    };
}

export function nsfwImageFromReq(fileField = "image", urlField = "imageUrl"): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // If there's no image to check, proceed
            const file: any = (req as any).file;
            if (!file?.buffer && !file?.path && !req.body?.[urlField]) {
                next();
                return;
            }
            
            // Check if Sightengine credentials are configured
            if (!process.env.SIGHTENGINE_API_USER || !process.env.SIGHTENGINE_API_SECRET) {
                console.warn('NSFW middleware: Sightengine API credentials not configured, skipping image moderation');
                // We can't moderate without credentials, so we'll just let it through
                next();
                return;
            }

            let se;
            try {
                if (file?.buffer) {
                    se = await seCheckImageUpload(file.buffer, file.originalname || "upload.jpg");
                } else if (file?.path) {
                    const stream = fs.createReadStream(file.path);
                    se = await seCheckImageUpload(stream as any, file.originalname || "upload.jpg");
                } else if (req.body?.[urlField]) {
                    se = await seCheckImageFromUrl(req.body[urlField]);
                }
                
                const decision = decideImage(se);
                if (respond(res, decision)) return; // stop if we sent a response
                (req as any).moderation = { ...(req as any).moderation, [fileField]: decision };
            } catch (seError: any) {
                // Log the error but allow the request to proceed
                console.error('NSFW image check failed:', seError?.message || seError);
                console.warn('NSFW middleware: Allowing image without moderation due to API error');
                // Allow the request to proceed since moderation is failing
                next();
                return;
            }
            
            next();
        } catch (e: any) {
            console.error('Unexpected error in nsfwImageFromReq middleware:', e);
            // Allow the request to proceed rather than blocking everything
            console.warn('NSFW middleware: Allowing image despite error in filtering');
            next();
        }
    };
}

export { decideImage, decideText };
