import type { MediaListDraftItem, MediaListItem } from "@/lib/types";

export function createDraftMediaListItem(
  text = "",
  existingAttachments: string[] = [],
): MediaListDraftItem {
  return {
    id: crypto.randomUUID(),
    text,
    existingAttachments,
    attachments: [],
  };
}

export function createDraftMediaItemsFromStoredItems(items: MediaListItem[]) {
  const drafts = items
    .filter((item) => item.text.trim().length > 0 || item.attachments.length > 0)
    .map((item) => createDraftMediaListItem(item.text, item.attachments));

  return drafts.length > 0 ? drafts : [createDraftMediaListItem()];
}

export function renderMediaItemText(items: MediaListItem[]) {
  return items
    .map((item) => item.text.trim())
    .filter(Boolean)
    .join("\n");
}
