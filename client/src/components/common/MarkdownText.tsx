import React from 'react';

interface MarkdownTextProps {
  content: string;
  className?: string;
  onTagClick?: (tag: string) => void;
}

export const MarkdownText: React.FC<MarkdownTextProps> = ({ content, className = '', onTagClick }) => {
  if (!content) return <span className="text-gray-400 italic">Empty task</span>;

  // Split into tokens: tags (#tag), mentions (@mention), markdown (**bold**, *italic*, `code`, ~~strike~~), links ([text](url))
  const tokenRegex = /(\*\*.*?\*\*|\*.*?\*|~~.*?~~|`.*?`|\[.*?\]\(.*?\)|#[a-zA-Z0-9_-]+|@[a-zA-Z0-9_-]+|!\d{4}-\d{2}-\d{2})/g;
  const parts = content.split(tokenRegex);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (!part) return null;

        // Bold
        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
          return <strong key={i} className="font-semibold text-gray-900 dark:text-white">{part.slice(2, -2)}</strong>;
        }

        // Italic
        if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
          return <em key={i} className="italic text-gray-800 dark:text-gray-200">{part.slice(1, -1)}</em>;
        }

        // Strikethrough
        if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
          return <span key={i} className="line-through text-gray-500 dark:text-gray-400">{part.slice(2, -2)}</span>;
        }

        // Code
        if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
          return (
            <code key={i} className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-rose-600 dark:text-rose-400 rounded font-mono">
              {part.slice(1, -1)}
            </code>
          );
        }

        // Link [title](url)
        const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
        if (linkMatch) {
          return (
            <a
              key={i}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              {linkMatch[1]}
            </a>
          );
        }

        // Tag #tag
        if (part.startsWith('#')) {
          return (
            <span
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                onTagClick?.(part);
              }}
              className="inline-block px-1.5 py-0.2 mx-0.5 text-xs font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800/60 hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer transition-colors"
            >
              {part}
            </span>
          );
        }

        // Mention @mention
        if (part.startsWith('@')) {
          return (
            <span
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                onTagClick?.(part);
              }}
              className="inline-block px-1.5 py-0.2 mx-0.5 text-xs font-medium bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 rounded border border-purple-200 dark:border-purple-800/60 hover:bg-purple-100 dark:hover:bg-purple-900 cursor-pointer transition-colors"
            >
              {part}
            </span>
          );
        }

        // Date chip !YYYY-MM-DD
        if (part.startsWith('!') && /!\d{4}-\d{2}-\d{2}/.test(part)) {
          return (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-1.5 py-0.2 mx-0.5 text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800/60"
            >
              📅 {part.slice(1)}
            </span>
          );
        }

        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};
