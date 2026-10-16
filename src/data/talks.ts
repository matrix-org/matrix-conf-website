// Helpers shared by the recordings list and the page of a single talk.
import slugify from "@sindresorhus/slugify";
import type { CollectionEntry } from "astro:content";

export type Talk = CollectionEntry<"talks">;

/** URL segment of a talk's own page, and the anchor of its card in the list. */
export const talkSlug = (talk: Talk) => slugify(talk.data["Proposal title"]);

/** File name offered when downloading the slides of `talk`, or an empty string if it has none. */
export function slidesFilename(talk: Talk): string {
    if (!talk.data.slides) return "";
    const start = talk.data.Start.split("T")[0];
    const speakers = talk.data["Speaker names"].join(", ");
    return `MC26_${[start, speakers, talk.data["Proposal title"]].map((seg) => slugify(seg)).join("_")}.pdf`;
}
