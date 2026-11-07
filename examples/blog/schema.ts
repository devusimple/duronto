import { table, junction, id, text, int, bool, timestamp, ref } from "../../src/index.js";

export const user = table("user", {
  id: id(),
  email: text().unique().notNull(),
  name: text().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
});

export const post = table("post", {
  id: id(),
  title: text().notNull(),
  body: text(),
  published: bool().default(false).notNull(),
  authorId: ref(() => user.id, { onDelete: "cascade" }).notNull(),
});

export const tag = table("tag", {
  id: id(),
  label: text().unique().notNull(),
});

export const postTag = junction("post_tag", {
  post: () => post.id,
  tag: () => tag.id,
}, { onDelete: "cascade" });