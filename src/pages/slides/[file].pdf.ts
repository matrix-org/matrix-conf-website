import type { APIRoute } from "astro";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export function getStaticPaths() {
    return readdirSync("src/talks", { withFileTypes: true }).flatMap((entry) => {
        if (!entry.isDirectory()) return [];
        const directory = join("src/talks", entry.name);
        const path = join(directory, "slides.pdf");
        if (!existsSync(path)) return [];
        const session = JSON.parse(readFileSync(join(directory, "session.json"), "utf8"));
        return [{ params: { file: `slides_${session.ID}` }, props: { path } }];
    });
}

export const GET: APIRoute = ({ props }) =>
    new Response(new Uint8Array(readFileSync(props.path)), {
        headers: { "Content-Type": "application/pdf" },
    });
