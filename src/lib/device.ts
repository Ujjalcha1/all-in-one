"use client";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("pdf_device_id");
  if (!id) {
    // Generate a reasonably unique random device ID
    id = "dev_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("pdf_device_id", id);
  }
  return id;
}
