export type ChangelogInline =
  | {type: 'text'; text: string}
  | {type: 'code'; text: string}
  | {type: 'strong'; children: ChangelogInline[]}
  | {type: 'em'; children: ChangelogInline[]}
  | {type: 'link'; href: string; children: ChangelogInline[]}
  | {type: 'image'; src: string; alt: string};

export type ChangelogBlock =
  | {type: 'heading'; level: 1 | 2 | 3; children: ChangelogInline[]}
  | {type: 'paragraph'; children: ChangelogInline[]}
  | {type: 'list'; ordered: boolean; items: ChangelogInline[][]}
  | {type: 'code'; language: string | null; text: string}
  | {type: 'quote'; children: ChangelogInline[]}
  | {type: 'divider'};

const SAFE_HREF = /^(https?:\/\/|mailto:|\/|#)/i;

/** Links and images only keep http(s), mailto, absolute-path and in-page targets. */
export function safeChangelogHref(href: string): string | null {
  const value = href.trim();
  if (!value || value.startsWith('//')) return null;
  return SAFE_HREF.test(value) ? value : null;
}

function parseInline(source: string): ChangelogInline[] {
  const nodes: ChangelogInline[] = [];
  let text = '';
  const flush = () => { if (text) { nodes.push({type: 'text', text}); text = ''; } };

  for (let index = 0; index < source.length; index++) {
    const rest = source.slice(index);

    if (rest.startsWith('`')) {
      const end = rest.indexOf('`', 1);
      if (end > 1) { flush(); nodes.push({type: 'code', text: rest.slice(1, end)}); index += end; continue; }
    }
    if (rest.startsWith('**')) {
      const end = rest.indexOf('**', 2);
      if (end > 2) { flush(); nodes.push({type: 'strong', children: parseInline(rest.slice(2, end))}); index += end + 1; continue; }
    }
    if (rest.startsWith('![')) {
      const match = /^!\[([^\]]*)\]\(([^)\s]+)\)/.exec(rest);
      const href = match ? safeChangelogHref(match[2]) : null;
      if (match && href) { flush(); nodes.push({type: 'image', src: href, alt: match[1]}); index += match[0].length - 1; continue; }
    }
    if (rest.startsWith('[')) {
      const match = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest);
      const href = match ? safeChangelogHref(match[2]) : null;
      if (match && href) { flush(); nodes.push({type: 'link', href, children: parseInline(match[1])}); index += match[0].length - 1; continue; }
    }
    if (rest.startsWith('*') || rest.startsWith('_')) {
      const marker = rest[0];
      const end = rest.indexOf(marker, 1);
      if (end > 1 && !/\s/.test(rest[1] ?? '')) { flush(); nodes.push({type: 'em', children: parseInline(rest.slice(1, end))}); index += end; continue; }
    }
    text += source[index];
  }
  flush();
  return nodes;
}

export function parseChangelogMarkdown(source: string): ChangelogBlock[] {
  const blocks: ChangelogBlock[] = [];
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) { index++; continue; }

    if (/^(?:---+|\*\*\*+|___+)$/.test(trimmed)) { blocks.push({type: 'divider'}); index++; continue; }

    const fence = /^```(\w*)/.exec(trimmed);
    if (fence) {
      const body: string[] = [];
      index++;
      while (index < lines.length && !lines[index].trim().startsWith('```')) { body.push(lines[index]); index++; }
      index++;
      blocks.push({type: 'code', language: fence[1] || null, text: body.join('\n')});
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      blocks.push({type: 'heading', level: heading[1].length as 1 | 2 | 3, children: parseInline(heading[2].trim())});
      index++;
      continue;
    }

    if (/^[-*+]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) {
      const ordered = /^\d/.test(trimmed);
      const items: ChangelogInline[][] = [];
      while (index < lines.length) {
        const item = lines[index].trim();
        const match = ordered ? /^\d+[.)]\s+(.*)$/.exec(item) : /^[-*+]\s+(.*)$/.exec(item);
        if (!match) break;
        items.push(parseInline(match[1].trim()));
        index++;
      }
      blocks.push({type: 'list', ordered, items});
      continue;
    }

    if (trimmed.startsWith('>')) {
      const quote: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('>')) {
        quote.push(lines[index].trim().replace(/^>\s?/, ''));
        index++;
      }
      blocks.push({type: 'quote', children: parseInline(quote.join(' '))});
      continue;
    }

    const paragraph: string[] = [trimmed];
    index++;
    while (index < lines.length) {
      const next = lines[index].trim();
      if (/^(?:---+|\*\*\*+|___+)$/.test(next)) break;
      if (!next || /^(#{1,3}\s|[-*+]\s|\d+[.)]\s|>|```)/.test(next)) break;
      paragraph.push(next);
      index++;
    }
    blocks.push({type: 'paragraph', children: parseInline(paragraph.join(' '))});
  }

  return blocks;
}

/** Single-line plain text, used for summaries, meta descriptions and previews. */
export function changelogPlainText(markdown: string): string {
  const flatten = (nodes: ChangelogInline[]): string => nodes.map(node => {
    switch (node.type) {
      case 'text': return node.text;
      case 'code': return node.text;
      case 'image': return node.alt;
      default: return flatten(node.children);
    }
  }).join('');
  return parseChangelogMarkdown(markdown)
    .map(block => block.type === 'code' ? '' : block.type === 'list' ? block.items.map(flatten).join(' ') : block.type === 'heading' || block.type === 'paragraph' || block.type === 'quote' ? flatten(block.children) : '')
    .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}
