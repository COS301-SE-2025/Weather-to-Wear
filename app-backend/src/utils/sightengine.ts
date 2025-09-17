// src/utils/sightengine.ts
import axios from "axios";
import FormData from "form-data";
import fs from "fs";

const API_USER = process.env.SIGHTENGINE_API_USER!;
const API_SECRET = process.env.SIGHTENGINE_API_SECRET!;
const BASE = process.env.SIGHTENGINE_API_URL || "https://api.sightengine.com/1.0";

export async function seCheckImageFromUrl(url: string, models = "nudity-2.1,offensive-2.0") {
  const { data } = await axios.get(`${BASE}/check.json`, {
    params: { url, models, api_user: API_USER, api_secret: API_SECRET },
    timeout: 12000,
  });
  return data;
}

export async function seCheckImageUpload(
  source: Buffer | fs.ReadStream,
  filename = "upload.jpg",
  models = "nudity-2.1,offensive-2.0"
) {
  const fd = new FormData();
  fd.append("media", source as any, { filename } as any);
  fd.append("models", models);
  fd.append("api_user", API_USER);
  fd.append("api_secret", API_SECRET);

  const { data } = await axios.post(`${BASE}/check.json`, fd, {
    headers: fd.getHeaders(),
    timeout: 20000,
    maxContentLength: 20 * 1024 * 1024,
  });
  return data;
}

export async function seCheckText(text: string, lang = "en", mode = "rules,ml") {
  const fd = new FormData();
  fd.append("text", text);
  fd.append("lang", lang);
  fd.append("mode", mode);
  fd.append("api_user", API_USER);
  fd.append("api_secret", API_SECRET);

  const { data } = await axios.post(`${BASE}/text/check.json`, fd, {
    headers: fd.getHeaders(),
    timeout: 8000,
  });
  return data;
}
