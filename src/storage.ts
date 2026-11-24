import { openDB } from "idb";
import type { Data } from "./model.ts";
export type Mode = "personal" | "demo";
export const storage = () =>
  openDB("finans360", 1, {
    upgrade(db) {
      db.createObjectStore("state");
    },
  });
export async function load(mode: Mode): Promise<Data | undefined> {
  return (await storage()).get("state", mode);
}
export async function update(
  mode: Mode,
  initial: Data,
  change: (rows: Data) => Data,
) {
  const transaction = (await storage()).transaction("state", "readwrite");
  const rows = change((await transaction.store.get(mode)) ?? initial);
  await transaction.store.put(rows, mode);
  await transaction.done;
  return rows;
}
