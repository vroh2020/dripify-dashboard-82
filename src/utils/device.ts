import { v4 as uuidv4 } from "uuid";
import { get, set } from "idb-keyval";

const DEVICE_KEY = "lovable_device_id";

export async function getDeviceId(): Promise<string> {
  let existing = await get(DEVICE_KEY);
  if (existing && typeof existing === "string") return existing;

  const newId = `device-${uuidv4()}`;
  await set(DEVICE_KEY, newId);
  return newId;
}

export async function resetDeviceId(): Promise<void> {
  const newId = `device-${uuidv4()}`;
  await set(DEVICE_KEY, newId);
}

export async function deleteDeviceId(): Promise<void> {
  await set(DEVICE_KEY, null);
}