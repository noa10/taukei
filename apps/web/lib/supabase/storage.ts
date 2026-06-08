import { createBrowserSupabaseClient } from "./client";
import type { SupabaseClient } from "@supabase/supabase-js";

const MENU_IMAGES_BUCKET = "menu-images";

function getStorage(client: SupabaseClient) {
  return client.storage.from(MENU_IMAGES_BUCKET);
}

async function ensureBucket(client: SupabaseClient): Promise<boolean> {
  try {
    const { data: buckets } = await client.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === MENU_IMAGES_BUCKET);
    if (!exists) {
      const { error } = await client.storage.createBucket(MENU_IMAGES_BUCKET, {
        public: true,
      });
      if (error) {
        console.warn("[storage] Could not create bucket:", error.message);
        return false;
      }
    }
    return true;
  } catch (err) {
    console.warn("[storage] Error ensuring bucket:", err);
    return false;
  }
}

/**
 * Upload a menu item image to Supabase Storage.
 * Returns the public file path or null if the upload fails (including when the bucket is missing and cannot be created).
 */
export async function uploadMenuItemImage(
  file: File,
  fileName: string
): Promise<string | null> {
  const client = createBrowserSupabaseClient();
  if (!client) return null;

  const bucketReady = await ensureBucket(client);
  if (!bucketReady) return null;

  const storage = getStorage(client);
  const { error } = await storage.upload(fileName, file, {
    upsert: true,
    contentType: file.type,
  });

  if (error) {
    console.warn("[storage] Upload error:", error.message);
    return null;
  }

  return fileName;
}

/**
 * Get the public URL for a menu item image stored in Supabase Storage.
 * Returns a fallback data URL if the client is unavailable or the path is empty.
 */
export function getMenuItemImageUrl(
  path: string | null | undefined
): string {
  if (!path) return "";

  const client = createBrowserSupabaseClient();
  if (!client) return "";

  const { data } = client.storage.from(MENU_IMAGES_BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? "";
}

/**
 * Delete a menu item image from Supabase Storage.
 * Returns true if the deletion succeeded (or the file did not exist).
 */
export async function deleteMenuItemImage(
  path: string
): Promise<boolean> {
  const client = createBrowserSupabaseClient();
  if (!client) return false;

  const storage = getStorage(client);
  const { error } = await storage.remove([path]);
  if (error) {
    console.warn("[storage] Delete error:", error.message);
    return false;
  }
  return true;
}
