"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type EmojiItem = { emoji: string; name: string };
type Category = { id: string; label: string; icon: string; emojis: EmojiItem[] };

const RECENT_KEY = "chat-emoji-recent";
const MAX_RECENT = 16;

const CATEGORIES: Category[] = [
  {
    id: "smileys",
    label: "Smileys",
    icon: "😊",
    emojis: [
      { emoji: "😀", name: "grinning" },
      { emoji: "😃", name: "smiley" },
      { emoji: "😄", name: "smile" },
      { emoji: "😁", name: "grin" },
      { emoji: "😆", name: "laugh" },
      { emoji: "😅", name: "sweat smile" },
      { emoji: "🤣", name: "rofl" },
      { emoji: "😂", name: "joy" },
      { emoji: "🙂", name: "slight smile" },
      { emoji: "🙃", name: "upside down" },
      { emoji: "😉", name: "wink" },
      { emoji: "😊", name: "blush" },
      { emoji: "😇", name: "innocent" },
      { emoji: "🥰", name: "smiling hearts" },
      { emoji: "😍", name: "heart eyes" },
      { emoji: "🤩", name: "star struck" },
      { emoji: "😘", name: "kiss heart" },
      { emoji: "😗", name: "kissing" },
      { emoji: "😋", name: "yum" },
      { emoji: "😛", name: "tongue" },
      { emoji: "😜", name: "winking tongue" },
      { emoji: "🤪", name: "zany" },
      { emoji: "😝", name: "squint tongue" },
      { emoji: "🤑", name: "money mouth" },
      { emoji: "🤗", name: "hugging" },
      { emoji: "🤭", name: "hand over mouth" },
      { emoji: "🤫", name: "shushing" },
      { emoji: "🤔", name: "thinking" },
      { emoji: "🤐", name: "zipper mouth" },
      { emoji: "😐", name: "neutral" },
      { emoji: "😑", name: "expressionless" },
      { emoji: "😶", name: "no mouth" },
      { emoji: "😏", name: "smirk" },
      { emoji: "😒", name: "unamused" },
      { emoji: "🙄", name: "rolling eyes" },
      { emoji: "😬", name: "grimace" },
      { emoji: "😮‍💨", name: "exhale" },
      { emoji: "🤥", name: "lying" },
      { emoji: "😌", name: "relieved" },
      { emoji: "😔", name: "pensive" },
      { emoji: "😪", name: "sleepy" },
      { emoji: "🤤", name: "drooling" },
      { emoji: "😴", name: "sleeping" },
      { emoji: "😷", name: "mask" },
      { emoji: "🤒", name: "thermometer" },
      { emoji: "🤕", name: "bandage" },
      { emoji: "😵", name: "dizzy" },
      { emoji: "🥳", name: "partying" },
      { emoji: "🥺", name: "pleading" },
      { emoji: "😢", name: "cry" },
      { emoji: "😭", name: "sob" },
      { emoji: "😤", name: "triumph" },
      { emoji: "😠", name: "angry" },
      { emoji: "😡", name: "rage" },
      { emoji: "🤬", name: "cursing" },
      { emoji: "😳", name: "flushed" },
      { emoji: "🥵", name: "hot" },
      { emoji: "🥶", name: "cold" },
      { emoji: "😶‍🌫️", name: "fog" },
      { emoji: "😱", name: "scream" },
      { emoji: "😖", name: "confounded" },
      { emoji: "😣", name: "persevere" },
      { emoji: "😞", name: "disappointed" },
      { emoji: "😓", name: "downcast sweat" },
      { emoji: "😩", name: "weary" },
      { emoji: "😫", name: "tired" },
      { emoji: "🥱", name: "yawn" },
    ],
  },
  {
    id: "people",
    label: "People",
    icon: "👋",
    emojis: [
      { emoji: "👋", name: "waving hand" },
      { emoji: "🤚", name: "raised back hand" },
      { emoji: "🖐️", name: "hand splayed" },
      { emoji: "✋", name: "raised hand" },
      { emoji: "🖖", name: "vulcan salute" },
      { emoji: "👌", name: "ok hand" },
      { emoji: "🤏", name: "pinching hand" },
      { emoji: "✌️", name: "victory" },
      { emoji: "🤞", name: "crossed fingers" },
      { emoji: "🫰", name: "hand with index" },
      { emoji: "🤟", name: "love you" },
      { emoji: "🤘", name: "rock on" },
      { emoji: "🤙", name: "call me" },
      { emoji: "👈", name: "point left" },
      { emoji: "👉", name: "point right" },
      { emoji: "👆", name: "point up" },
      { emoji: "🖕", name: "middle finger" },
      { emoji: "👇", name: "point down" },
      { emoji: "☝️", name: "point up 2" },
      { emoji: "👍", name: "thumbs up" },
      { emoji: "👎", name: "thumbs down" },
      { emoji: "👊", name: "fist" },
      { emoji: "✊", name: "raised fist" },
      { emoji: "🤛", name: "left fist" },
      { emoji: "🤜", name: "right fist" },
      { emoji: "👏", name: "clapping" },
      { emoji: "🙌", name: "raised hands" },
      { emoji: "🫶", name: "heart hands" },
      { emoji: "👐", name: "open hands" },
      { emoji: "🤲", name: "palms up" },
      { emoji: "🙏", name: "pray" },
      { emoji: "💪", name: "muscle" },
      { emoji: "🦾", name: "mechanical arm" },
      { emoji: "🦿", name: "mechanical leg" },
    ],
  },
  {
    id: "animals",
    label: "Animals",
    icon: "🐶",
    emojis: [
      { emoji: "🐶", name: "dog" },
      { emoji: "🐱", name: "cat" },
      { emoji: "🐭", name: "mouse" },
      { emoji: "🐹", name: "hamster" },
      { emoji: "🐰", name: "rabbit" },
      { emoji: "🦊", name: "fox" },
      { emoji: "🐻", name: "bear" },
      { emoji: "🐼", name: "panda" },
      { emoji: "🐨", name: "koala" },
      { emoji: "🦁", name: "lion" },
      { emoji: "🐯", name: "tiger" },
      { emoji: "🦄", name: "unicorn" },
      { emoji: "🐔", name: "chicken" },
      { emoji: "🐧", name: "penguin" },
      { emoji: "🐸", name: "frog" },
      { emoji: "🐢", name: "turtle" },
      { emoji: "🦋", name: "butterfly" },
      { emoji: "🐝", name: "bee" },
      { emoji: "🦖", name: "t-rex" },
      { emoji: "🦕", name: "sauropod" },
    ],
  },
  {
    id: "food",
    label: "Food",
    icon: "🍎",
    emojis: [
      { emoji: "🍏", name: "green apple" },
      { emoji: "🍎", name: "red apple" },
      { emoji: "🍐", name: "pear" },
      { emoji: "🍊", name: "tangerine" },
      { emoji: "🍋", name: "lemon" },
      { emoji: "🍌", name: "banana" },
      { emoji: "🍉", name: "watermelon" },
      { emoji: "🍇", name: "grapes" },
      { emoji: "🍓", name: "strawberry" },
      { emoji: "🫐", name: "blueberries" },
      { emoji: "🍒", name: "cherries" },
      { emoji: "🍑", name: "peach" },
      { emoji: "🍕", name: "pizza" },
      { emoji: "🍔", name: "burger" },
      { emoji: "🍟", name: "fries" },
      { emoji: "🌮", name: "taco" },
      { emoji: "🍣", name: "sushi" },
      { emoji: "☕", name: "coffee" },
      { emoji: "🍺", name: "beer" },
      { emoji: "🎂", name: "birthday cake" },
    ],
  },
  {
    id: "travel",
    label: "Travel",
    icon: "✈️",
    emojis: [
      { emoji: "🚗", name: "car" },
      { emoji: "🚕", name: "taxi" },
      { emoji: "🚙", name: "suv" },
      { emoji: "🚌", name: "bus" },
      { emoji: "🚎", name: "trolleybus" },
      { emoji: "🏎️", name: "racing car" },
      { emoji: "🚓", name: "police car" },
      { emoji: "🚑", name: "ambulance" },
      { emoji: "✈️", name: "airplane" },
      { emoji: "🚀", name: "rocket" },
      { emoji: "🛸", name: "flying saucer" },
      { emoji: "🚲", name: "bicycle" },
      { emoji: "🛴", name: "scooter" },
      { emoji: "🏖️", name: "beach" },
      { emoji: "🏔️", name: "mountain" },
      { emoji: "🗼", name: "tokyo tower" },
      { emoji: "🗽", name: "statue liberty" },
      { emoji: "🌈", name: "rainbow" },
      { emoji: "🔥", name: "fire" },
      { emoji: "💧", name: "droplet" },
    ],
  },
  {
    id: "activities",
    label: "Activities",
    icon: "⚽",
    emojis: [
      { emoji: "⚽", name: "soccer" },
      { emoji: "🏀", name: "basketball" },
      { emoji: "🏈", name: "football" },
      { emoji: "⚾", name: "baseball" },
      { emoji: "🎾", name: "tennis" },
      { emoji: "🏐", name: "volleyball" },
      { emoji: "🎮", name: "video game" },
      { emoji: "🎲", name: "game die" },
      { emoji: "🧩", name: "puzzle" },
      { emoji: "🎯", name: "dart" },
      { emoji: "🎨", name: "art palette" },
      { emoji: "🎬", name: "clapper" },
      { emoji: "🎤", name: "microphone" },
      { emoji: "🎧", name: "headphone" },
      { emoji: "🎵", name: "musical note" },
      { emoji: "🏆", name: "trophy" },
      { emoji: "🥇", name: "first medal" },
      { emoji: "🎉", name: "party popper" },
      { emoji: "🎊", name: "confetti" },
      { emoji: "🎈", name: "balloon" },
    ],
  },
  {
    id: "objects",
    label: "Objects",
    icon: "💡",
    emojis: [
      { emoji: "⌚", name: "watch" },
      { emoji: "📱", name: "mobile phone" },
      { emoji: "💻", name: "laptop" },
      { emoji: "⌨️", name: "keyboard" },
      { emoji: "🖥️", name: "desktop" },
      { emoji: "🖨️", name: "printer" },
      { emoji: "💡", name: "bulb" },
      { emoji: "🔦", name: "flashlight" },
      { emoji: "📷", name: "camera" },
      { emoji: "🔋", name: "battery" },
      { emoji: "🔌", name: "plug" },
      { emoji: "💰", name: "money bag" },
      { emoji: "💎", name: "gem" },
      { emoji: "🔨", name: "hammer" },
      { emoji: "🔧", name: "wrench" },
      { emoji: "📚", name: "books" },
      { emoji: "🔑", name: "key" },
      { emoji: "🔒", name: "lock" },
      { emoji: "🎁", name: "gift" },
      { emoji: "💌", name: "love letter" },
    ],
  },
  {
    id: "symbols",
    label: "Symbols",
    icon: "❤️",
    emojis: [
      { emoji: "❤️", name: "red heart" },
      { emoji: "🧡", name: "orange heart" },
      { emoji: "💛", name: "yellow heart" },
      { emoji: "💚", name: "green heart" },
      { emoji: "💙", name: "blue heart" },
      { emoji: "💜", name: "purple heart" },
      { emoji: "🖤", name: "black heart" },
      { emoji: "🤍", name: "white heart" },
      { emoji: "🤎", name: "brown heart" },
      { emoji: "💔", name: "broken heart" },
      { emoji: "❤️‍🔥", name: "heart on fire" },
      { emoji: "💯", name: "hundred" },
      { emoji: "💢", name: "anger" },
      { emoji: "💥", name: "collision" },
      { emoji: "💫", name: "dizzy" },
      { emoji: "💦", name: "sweat droplets" },
      { emoji: "💨", name: "dash" },
      { emoji: "⭐", name: "star" },
      { emoji: "🌟", name: "glowing star" },
      { emoji: "✨", name: "sparkles" },
    ],
  },
];

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === "string").slice(0, MAX_RECENT);
  } catch {}
  return [];
}

function saveRecent(emoji: string) {
  if (typeof window === "undefined") return;
  try {
    const cur = loadRecent();
    const next = [emoji, ...cur.filter((x) => x !== emoji)].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("smileys");
  const [recent, setRecent] = useState<string[]>(() => loadRecent());

  const handleSelect = (emoji: string) => {
    saveRecent(emoji);
    setRecent(loadRecent());
    onSelect(emoji);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    const all = CATEGORIES.flatMap((c) => c.emojis);
    return all.filter((e) => e.name.includes(q) || e.emoji.includes(q)).slice(0, 60);
  }, [search]);

  return (
    <div
      role="dialog"
      aria-label="Emoji picker"
      className="flex max-h-[320px] w-[320px] max-w-[90vw] flex-col overflow-hidden rounded-2xl border border-border bg-glass-strong shadow-dropdown backdrop-blur-2xl sm:w-[360px]"
    >
      <div className="shrink-0 border-b border-border/50 p-2">
        <input
          autoFocus
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emoji…"
          aria-label="Search emoji"
          className="w-full rounded-full bg-surface px-3 py-2 text-sm text-ink-50 placeholder:text-ink-500 outline-none focus:ring-2 focus:ring-accent-400/40"
        />
      </div>

      {!search && (
        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border/30 p-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              aria-label={cat.label}
              aria-pressed={activeCategory === cat.id}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base transition-colors",
                activeCategory === cat.id ? "bg-accent text-white" : "bg-surface hover:bg-surface-hover text-ink-600",
              )}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {filtered ? (
          filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-500">No results</p>
          ) : (
            <div className="grid grid-cols-8 gap-1">
              {filtered.map((e) => (
                <button
                  key={e.emoji + e.name}
                  type="button"
                  onClick={() => handleSelect(e.emoji)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-xl hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
                  aria-label={e.name}
                >
                  {e.emoji}
                </button>
              ))}
            </div>
          )
        ) : (
          <>
            {recent.length > 0 && (
              <div className="mb-3">
                <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-widest text-ink-500">Recent</p>
                <div className="grid grid-cols-8 gap-1">
                  {recent.map((emoji) => (
                    <button
                      key={`recent-${emoji}`}
                      type="button"
                      onClick={() => handleSelect(emoji)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-xl hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {CATEGORIES.filter((c) => c.id === activeCategory).map((cat) => (
              <div key={cat.id}>
                <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-widest text-ink-500">{cat.label}</p>
                <div className="grid grid-cols-8 gap-1">
                  {cat.emojis.map((e) => (
                    <button
                      key={e.emoji}
                      type="button"
                      onClick={() => handleSelect(e.emoji)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-xl hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
                      aria-label={e.name}
                    >
                      {e.emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
