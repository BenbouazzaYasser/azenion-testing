export type StickerPack = {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  stickers: Sticker[];
};

export type Sticker = {
  id: string;
  packId: string;
  name: string;
  url: string; // public path /stickers/...
  width: number;
  height: number;
  keywords: string[];
};

export const STICKER_PACKS: StickerPack[] = [
  {
    id: "classic",
    name: "Azenion Classic",
    description: "Clean expressive stickers",
    thumbnail: "/stickers/classic/thumb.svg",
    stickers: [
      { id: "classic-01", packId: "classic", name: "Hello", url: "/stickers/classic/01.svg", width: 120, height: 120, keywords: ["hello", "wave", "hi"] },
      { id: "classic-02", packId: "classic", name: "Love", url: "/stickers/classic/02.svg", width: 120, height: 120, keywords: ["love", "heart", "like"] },
      { id: "classic-03", packId: "classic", name: "Laugh", url: "/stickers/classic/03.svg", width: 120, height: 120, keywords: ["laugh", "joy", "haha"] },
      { id: "classic-04", packId: "classic", name: "Wow", url: "/stickers/classic/04.svg", width: 120, height: 120, keywords: ["wow", "surprised", "omg"] },
      { id: "classic-05", packId: "classic", name: "Cool", url: "/stickers/classic/05.svg", width: 120, height: 120, keywords: ["cool", "sunglasses", "nice"] },
      { id: "classic-06", packId: "classic", name: "Thanks", url: "/stickers/classic/06.svg", width: 120, height: 120, keywords: ["thanks", "thank you", "appreciate"] },
      { id: "classic-07", packId: "classic", name: "Fire", url: "/stickers/classic/07.svg", width: 120, height: 120, keywords: ["fire", "hot", "lit"] },
      { id: "classic-08", packId: "classic", name: "Party", url: "/stickers/classic/08.svg", width: 120, height: 120, keywords: ["party", "celebrate", "tada"] },
    ],
  },
  {
    id: "playful",
    name: "Azenion Playful",
    description: "Fun and energetic",
    thumbnail: "/stickers/playful/thumb.svg",
    stickers: [
      { id: "playful-01", packId: "playful", name: "Rocket", url: "/stickers/playful/01.svg", width: 120, height: 120, keywords: ["rocket", "launch", "fast"] },
      { id: "playful-02", packId: "playful", name: "Star", url: "/stickers/playful/02.svg", width: 120, height: 120, keywords: ["star", "favorite", "shine"] },
      { id: "playful-03", packId: "playful", name: "Coffee", url: "/stickers/playful/03.svg", width: 120, height: 120, keywords: ["coffee", "cafe", "morning"] },
      { id: "playful-04", packId: "playful", name: "Idea", url: "/stickers/playful/04.svg", width: 120, height: 120, keywords: ["idea", "bulb", "light"] },
      { id: "playful-05", packId: "playful", name: "Thumbs Up", url: "/stickers/playful/05.svg", width: 120, height: 120, keywords: ["thumbs up", "good", "yes"] },
      { id: "playful-06", packId: "playful", name: "Clap", url: "/stickers/playful/06.svg", width: 120, height: 120, keywords: ["clap", "applause", "bravo"] },
      { id: "playful-07", packId: "playful", name: "Eyes", url: "/stickers/playful/07.svg", width: 120, height: 120, keywords: ["eyes", "look", "see"] },
      { id: "playful-08", packId: "playful", name: "Heart Eyes", url: "/stickers/playful/08.svg", width: 120, height: 120, keywords: ["heart eyes", "love", "adore"] },
    ],
  },
];

const STICKER_MAP = new Map<string, Sticker>();
for (const pack of STICKER_PACKS) {
  for (const s of pack.stickers) {
    STICKER_MAP.set(s.id, s);
  }
}

export function getStickerById(id: string): Sticker | undefined {
  return STICKER_MAP.get(id);
}

export function isValidStickerId(id: string): boolean {
  return STICKER_MAP.has(id);
}

export function getAllStickers(): Sticker[] {
  return Array.from(STICKER_MAP.values());
}

export function getStickersByPack(packId: string): Sticker[] {
  return STICKER_MAP.get(packId) ? [STICKER_MAP.get(packId)!] : STICKER_PACKS.find((p) => p.id === packId)?.stickers ?? [];
}
