import { openDB, type DBSchema, type IDBPDatabase } from "idb";

interface CheckinRecord {
  id: string;
  ticketId: string;
  eventId: string;
  queuedAt: number;
  synced: boolean;
}

interface OfflineDB extends DBSchema {
  "checkin-queue": {
    key: string;
    value: CheckinRecord;
    indexes: { "by-synced": boolean };
  };
}

const DB_NAME = "785tickets-offline";
const DB_VERSION = 1;

let _db: IDBPDatabase<OfflineDB> | null = null;

async function getDb(): Promise<IDBPDatabase<OfflineDB>> {
  if (_db) return _db;
  _db = await openDB<OfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore("checkin-queue", { keyPath: "id" });
      store.createIndex("by-synced", "synced");
    },
  });
  return _db;
}

export async function queueCheckinOffline(record: Omit<CheckinRecord, "id" | "queuedAt" | "synced">) {
  const db = await getDb();
  const id = `${record.ticketId}-${Date.now()}`;
  await db.add("checkin-queue", {
    ...record,
    id,
    queuedAt: Date.now(),
    synced: false,
  });
  return id;
}

export async function getPendingCheckins(): Promise<CheckinRecord[]> {
  const db = await getDb();
  return db.getAllFromIndex("checkin-queue", "by-synced", IDBKeyRange.only(false));
}

export async function markCheckinSynced(id: string): Promise<void> {
  const db = await getDb();
  const record = await db.get("checkin-queue", id);
  if (record) {
    await db.put("checkin-queue", { ...record, synced: true });
  }
}

export async function clearSyncedCheckins(): Promise<void> {
  const db = await getDb();
  const synced = await db.getAllFromIndex("checkin-queue", "by-synced", IDBKeyRange.only(true));
  const tx = db.transaction("checkin-queue", "readwrite");
  await Promise.all(synced.map((r) => tx.store.delete(r.id)));
  await tx.done;
}
