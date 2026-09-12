import { assembleFeedItems } from "./feed-direct";

jest.mock("./supabase", () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

const POSTS = [
  {
    id: "p-1",
    author_id: "u-1",
    title: "Hello",
    body: "world",
    images: ["https://x/y.png", 42, null],
    videos: null,
    source_type: "user_post",
    source_id: null,
    created_at: "2026-09-12T10:00:00Z",
  },
];

describe("assembleFeedItems", () => {
  it("maps counts, self-state, and peer names; drops non-string media", () => {
    const peers = new Map([["u-1", { full_name: "Ada", username: "ada", avatar_url: "https://x/a.png" }]]);
    const [item] = assembleFeedItems(
      POSTS,
      peers,
      new Map([["user_post-p-1", 3]]),
      new Map([["user_post-p-1", 2]]),
      new Set(["user_post-p-1"]),
      new Set(["p-1"]),
    );
    expect(item).toMatchObject({
      id: "p-1",
      author_name: "Ada",
      author_username: "ada",
      author_avatar: "https://x/a.png",
      like_count: 3,
      comment_count: 2,
      user_has_liked: true,
      saved_by_user: true,
      images: ["https://x/y.png"],
    });
  });

  it("falls back gracefully for unknown authors and zero counts", () => {
    const [item] = assembleFeedItems(POSTS, new Map(), new Map(), new Map(), new Set(), new Set());
    expect(item).toMatchObject({
      author_name: null,
      author_username: null,
      like_count: 0,
      comment_count: 0,
      user_has_liked: false,
      saved_by_user: false,
    });
  });
});
