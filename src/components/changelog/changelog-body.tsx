import * as React from 'react';
import {parseChangelogMarkdown,type ChangelogInline} from '@/lib/changelog-markdown';

function renderInline(nodes: ChangelogInline[], keyPrefix = ''): React.ReactNode[] {
  return nodes.map((node, index) => {
    const key = keyPrefix + index;
    switch (node.type) {
      case 'text': return <React.Fragment key={key}>{node.text}</React.Fragment>;
      case 'code': return <code key={key} className="rounded-[5px] bg-control-quiet px-1 py-0.5 font-mono text-[0.92em] text-foreground">{node.text}</code>;
      case 'strong': return <strong key={key} className="font-semibold text-foreground">{renderInline(node.children, key + '.')}</strong>;
      case 'em': return <em key={key}>{renderInline(node.children, key + '.')}</em>;
      case 'link': return <a key={key} href={node.href} className="font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary" {...(node.href.startsWith('http') ? {rel: 'nofollow noopener noreferrer', target: '_blank'} : {})}>{renderInline(node.children, key + '.')}</a>;
      case 'image': return null;
    }
  });
}

function images(nodes: ChangelogInline[]): {src: string; alt: string}[] {
  return nodes.flatMap(node => node.type === 'image' ? [{src: node.src, alt: node.alt}] : node.type === 'strong' || node.type === 'em' || node.type === 'link' ? images(node.children) : []);
}

/** Markdown subset rendered to React nodes: nothing reaches `dangerouslySetInnerHTML`. */
export function ChangelogBody({markdown}:{markdown: string}): React.ReactElement {
  const blocks = parseChangelogMarkdown(markdown);
  return <div className="text-[15px] leading-7 text-foreground/85 sm:text-[16px] sm:leading-[1.75]">
    {blocks.map((block, index) => {
      switch (block.type) {
        case 'divider': return <hr key={index} className="my-8 border-border/60"/>;
        case 'heading':
          return block.level === 3
            ? <h3 key={index} className="mt-6 text-[20px] font-semibold leading-7 tracking-[-0.2px] text-foreground first:mt-0">{renderInline(block.children)}</h3>
            : <h2 key={index} className="mt-8 text-[24px] font-semibold leading-8 tracking-[-0.4px] text-foreground first:mt-0">{renderInline(block.children)}</h2>;
        case 'paragraph': {
          const inlineImages = images(block.children);
          return <React.Fragment key={index}>
            {inlineImages.map(image => <img key={image.src} src={image.src} alt={image.alt} loading="lazy" decoding="async" className="my-5 w-full rounded-[12px] border border-border/60"/>)}
            <p className="mt-4 first:mt-0">{renderInline(block.children)}</p>
          </React.Fragment>;
        }
        case 'list':
          return block.ordered
            ? <ol key={index} className="mt-4 list-decimal space-y-1.5 ps-5 marker:text-muted-foreground">{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item, itemIndex + '.')}</li>)}</ol>
            : <ul key={index} className="mt-4 list-disc space-y-1.5 ps-5 marker:text-muted-foreground">{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item, itemIndex + '.')}</li>)}</ul>;
        case 'code':
          return <pre key={index} className="mt-4 overflow-x-auto rounded-[10px] bg-control-quiet p-4 font-mono text-[13px] leading-6 text-foreground"><code>{block.text}</code></pre>;
        case 'quote':
          return <blockquote key={index} className="mt-4 border-s-2 border-border ps-4 text-muted-foreground">{renderInline(block.children)}</blockquote>;
      }
    })}
  </div>;
}
