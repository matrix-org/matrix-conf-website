import { createMarkdownProcessor } from "@astrojs/markdown-remark";

type HtmlNode = {
    type?: string;
    tagName?: string;
    properties?: Record<string, unknown>;
    children?: HtmlNode[];
};

function safeLinks() {
    return (tree: HtmlNode) => {
        const visit = (node: HtmlNode) => {
            if (node.type === "element" && node.properties) {
                for (const attribute of ["href", "src"]) {
                    const value = node.properties[attribute];
                    if (value) {
                        try {
                            if (!["http:", "https:", "mailto:"].includes(new URL(String(value), "https://conference.matrix.org").protocol)) {
                                delete node.properties[attribute];
                            }
                        } catch {
                            delete node.properties[attribute];
                        }
                    }
                }
            }
            node.children?.forEach(visit);
        };
        visit(tree);
    };
}

const processor = await createMarkdownProcessor({
    remarkRehype: { allowDangerousHtml: false },
    rehypePlugins: [safeLinks],
});

export async function renderTalkMarkdown(markdown: string) {
    return (await processor.render(markdown)).code;
}
