import { Device } from "@/models/Device";

export function parseUserAgent(ua: string) {
  let os = "Unknown OS";
  let browser = "Unknown Browser";

  if (/windows/i.test(ua)) os = "Windows";
  else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/linux/i.test(ua)) os = "Linux";

  if (/chrome|crios/i.test(ua) && !/edge|edg/i.test(ua) && !/opr|opera/i.test(ua)) {
    browser = "Chrome";
  } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
    browser = "Safari";
  } else if (/firefox|fxios/i.test(ua)) {
    browser = "Firefox";
  } else if (/edge|edg/i.test(ua)) {
    browser = "Edge";
  } else if (/opr|opera/i.test(ua)) {
    browser = "Opera";
  }

  return { os, browser };
}

export async function saveDeviceData(
  deviceId: string,
  email: string | null,
  userAgent: string,
  ip: string
) {
  const { os, browser } = parseUserAgent(userAgent);
  
  await Device.findOneAndUpdate(
    { deviceId },
    {
      $set: {
        email: email ? email.trim().toLowerCase() : null,
        userAgent,
        ip,
        os,
        browser,
        lastActive: new Date()
      },
      $setOnInsert: {
        createdAt: new Date()
      }
    },
    { upsert: true, new: true }
  );
}
