import type { MediaListDraftItem, MediaListItem } from "@/lib/types";

export function createDraftMediaListItem(text = ""): MediaListDraftItem {
  return {
    id: crypto.randomUUID(),
    text,
    attachments: [],
  };
}

export function renderMediaItemText(items: MediaListItem[]) {
  return items
    .map((item) => item.text.trim())
    .filter(Boolean)
    .join("\n");
}
