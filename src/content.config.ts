import { defineCollection, z } from 'astro:content';
import type { Loader } from 'astro/loaders';
import { readdir, readFile } from 'node:fs/promises';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// Astro's glob loader treats '?' and '#' in talk titles as URL syntax; read literal paths instead.
const talksLoader: Loader = {
    name: 'talks-loader',
    async load({ config, store, parseData, watcher, logger }) {
        const root = fileURLToPath(config.root);
        const talksDir = join(root, 'src/talks');

        async function sync() {
            const entries = [];
            const ids = new Set<string>();

            for (const dir of await readdir(talksDir, { withFileTypes: true })) {
                if (!dir.isDirectory()) continue;

                const filePath = join(talksDir, dir.name, 'session.json');
                let contents: string;
                try {
                    contents = await readFile(filePath, 'utf8');
                } catch (error) {
                    if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
                    throw error;
                }

                const data = JSON.parse(contents);
                const id = data.ID;
                if (typeof id !== 'string' || ids.has(id)) {
                    throw new Error(`Missing or duplicate session ID in ${filePath}`);
                }
                ids.add(id);

                const relativePath = relative(root, filePath);
                entries.push({
                    id,
                    data: await parseData({ id, data, filePath: relativePath }),
                    filePath: relativePath,
                });
            }

            store.clear();
            for (const entry of entries) store.set(entry);
        }

        await sync();
        // Serialize reloads so an older scan cannot overwrite a newer one.
        let reload = Promise.resolve();
        watcher?.add(talksDir);
        watcher?.on('all', (event, path) => {
            if (!['add', 'change', 'unlink'].includes(event)) return;
            if (basename(path) !== 'session.json' || dirname(dirname(path)) !== talksDir) return;
            reload = reload.then(sync).catch((error) => logger.error(`Failed to load talks: ${error}`));
        });
    },
};

const talks = defineCollection({
    loader: talksLoader,
    schema: z.object({
        ID: z.string(),
        "Proposal title": z.string(),
        Abstract: z.string(),
        Track: z.object({
            en: z.string()
        }).optional(),
        "Speaker names": z.array(z.string()),
        Room: z.object({
            en: z.string()
        }),
        Start: z.string(),
        youtube: z.string().url().optional(),
        slides: z.boolean().optional(),
        mediaCccDe: z.string().url().optional(),
    })
});

export const collections = { "talks": talks };
