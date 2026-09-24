// One entry per livestreamed room.
// TODO(before conf): confirm `stream` slugs against streaming.media.ccc.de and `chat` aliases with the Events WG.
export const CCC_CONFERENCE = "matrix-conf-2026";

export const streams = [
    { slug: "sofya", name: "Sofya", pretalxRoom: 6344, chat: "#sofya-mc26:matrix.org" },
    { slug: "katherine", name: "Katherine", pretalxRoom: 6345, chat: "#katherine-mc26:matrix.org" },
    { slug: "peter", name: "Peter", pretalxRoom: 6346, chat: "#peter-mc26:matrix.org" },
] as const;

export type Stream = (typeof streams)[number];

export const space = "#matrix-conference-2026:matrix.org";

export const matrixTo = (alias: string) =>
    `https://matrix.to/#/${encodeURIComponent(alias)}`;
export const cccStream = (slug: string) =>
    `https://streaming.media.ccc.de/${CCC_CONFERENCE}/${slug}`;
export const cccEmbed = (slug: string) => `${cccStream(slug)}/embed`;
