
import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  themeColor?: string; // New prop to support dynamic coloring based on context (Grammar vs Vocab)
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = "", themeColor = "indigo" }) => {
  if (!content) return null;

  // --- 1. PARSE INLINE STYLES ---
  const parseInline = (text: string): React.ReactNode[] => {
    // Regex Breakdown:
    // 1. ***bolditalic***
    // 2. **Label**: (Smart Label at start of line or sentence)
    // 3. **bold**
    // 4. *italic*
    // 5. _highlight_
    // 6. `code`
    
    const parts = text.split(/(\*\*\*.*?\*\*\*|^\s*\*\*.*?\*\*:\s|(?<=\s)\*\*.*?\*\*:\s|\*\*.*?\*\*|\*.*?\*|_[^_]+_|`[^`]+`)/g);

    return parts.map((part, i) => {
      if (!part) return null;

      // Smart Label Badge: **Label**:
      if (part.includes('**') && part.includes(':') && (part.trim().startsWith('**'))) {
          const label = part.replace(/\*\*/g, '').replace(':', '').trim();
          // Determine color based on label text or fallback to themeColor
          let badgeColor = `bg-${themeColor}-100 text-${themeColor}-700 border-${themeColor}-200`; // Dynamic Default
          const l = label.toLowerCase();
          if(l.includes('negative') || l.includes('false')) badgeColor = "bg-red-100 text-red-700 border-red-200";
          else if(l.includes('positive') || l.includes('true') || l.includes('correct')) badgeColor = "bg-green-100 text-green-700 border-green-200";
          else if(l.includes('question')) badgeColor = "bg-amber-100 text-amber-700 border-amber-200";
          else if(l.includes('structure') || l.includes('form')) badgeColor = `bg-${themeColor}-100 text-${themeColor}-700 border-${themeColor}-200`;

          return (
              <span key={i} className="inline-flex items-center gap-1 mr-2 mb-1 align-middle">
                  <span className={`px-2 py-0.5 rounded-md text-sm font-black uppercase tracking-wide border shadow-sm whitespace-nowrap ${badgeColor} dark:bg-opacity-80 dark:text-slate-900 dark:border-transparent`}>
                      {label}
                  </span>
                  <span className="font-bold text-slate-400">:</span>
              </span>
          );
      }

      // Bold Italic ***text***
      if (part.startsWith('***') && part.endsWith('***') && part.length > 6) {
        return <span key={i} className="font-black italic text-fuchsia-600 dark:text-fuchsia-400 tracking-wide">{parseInline(part.slice(3, -3))}</span>;
      }
      
      // Bold **text** - Dynamic color based on themeColor
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return <strong key={i} className={`font-black text-${themeColor}-700 dark:text-${themeColor}-300`}>{parseInline(part.slice(2, -2))}</strong>;
      }
      
      // Italic *text*
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return <em key={i} className="italic text-slate-600 dark:text-slate-400 font-serif">{parseInline(part.slice(1, -1))}</em>;
      }
      
      // Highlight _text_
      if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
        return <span key={i} className="bg-yellow-200 dark:bg-yellow-500/40 text-yellow-900 dark:text-yellow-100 px-1.5 rounded-md font-bold mx-0.5 shadow-sm inline-block">{parseInline(part.slice(1, -1))}</span>;
      }
      
      // Code `text`
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return <code key={i} className="bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-300 px-1.5 py-0.5 rounded-md font-mono text-sm border border-slate-200 dark:border-slate-700 font-bold">{part.slice(1, -1)}</code>;
      }
      
      return part;
    });
  };

  // --- 2. RENDER TABLES ---
  const renderTable = (rows: string[], key: string) => {
      const headerRow = rows[0].trim().slice(1, -1).split('|').map(c => c.trim());
      const bodyRows = rows.slice(2).map(row => 
          row.trim().slice(1, -1).split('|').map(c => c.trim())
      );

      return (
          <div key={key} className="my-8 overflow-hidden rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                      <thead>
                          <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
                              {headerRow.map((h, i) => (
                                  <th key={i} className="p-4 text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 first:pl-6">
                                      {parseInline(h)}
                                  </th>
                              ))}
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {bodyRows.map((row, i) => (
                              <tr key={i} className={`hover:bg-${themeColor}-50/30 dark:hover:bg-${themeColor}-900/20 transition-colors`}>
                                  {row.map((cell, j) => (
                                      <td key={j} className="p-4 text-slate-700 dark:text-slate-200 font-medium first:pl-6 first:font-bold text-sm md:text-base">
                                          {parseInline(cell)}
                                      </td>
                                  ))}
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      );
  };

  // --- 3. MAIN PARSER ---
  const renderBlocks = () => {
      const lines = content.split('\n');
      const blocks: React.ReactNode[] = [];
      
      let tableBuffer: string[] = [];
      let listBuffer: React.ReactNode[] = [];

      const flushList = () => {
          if (listBuffer.length > 0) {
              blocks.push(
                  <div key={`list-${blocks.length}`} className="my-6 space-y-3 pl-2">
                      {listBuffer}
                  </div>
              );
              listBuffer = [];
          }
      };

      const flushTable = () => {
          if (tableBuffer.length > 0) {
              blocks.push(renderTable(tableBuffer, `table-${blocks.length}`));
              tableBuffer = [];
          }
      };

      lines.forEach((line, index) => {
          const trimmed = line.trim();

          // --- TABLES ---
          if (trimmed.startsWith('|')) {
              flushList();
              tableBuffer.push(trimmed);
              return;
          } else {
              flushTable();
          }

          if (!trimmed) return;

          // --- HERO TITLE (#) ---
          if (trimmed.startsWith('# ')) {
              flushList();
              blocks.push(
                  <div key={`h1-${index}`} className={`bg-gradient-to-r from-${themeColor}-500 to-purple-600 p-6 rounded-3xl text-white shadow-lg mb-8 text-center transform hover:scale-[1.01] transition-transform border-2 border-${themeColor}-400/50`}>
                      <h1 className="text-2xl md:text-3xl font-black font-game tracking-tight">
                          {parseInline(trimmed.replace('# ', ''))}
                      </h1>
                  </div>
              );
              return;
          }

          // --- SECTION HEADER (##) ---
          if (trimmed.startsWith('## ')) {
              flushList();
              blocks.push(
                  <div key={`h2-${index}`} className="mt-10 mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-l-8 border-purple-500 shadow-sm">
                      <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                          {parseInline(trimmed.replace('## ', ''))}
                      </h2>
                  </div>
              );
              return;
          }

          // --- SUBHEADER (###) ---
          if (trimmed.startsWith('### ')) {
              flushList();
              blocks.push(
                  <h3 key={`h3-${index}`} className={`mt-8 mb-4 text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 border-l-4 border-${themeColor}-400 pl-3`}>
                      {parseInline(trimmed.replace('### ', ''))}
                  </h3>
              );
              return;
          }

          // --- RICH BLOCKQUOTES (VISUALLY ENHANCED) ---
          if (trimmed.startsWith('> ')) {
              flushList();
              const text = trimmed.replace(/^>\s+/, '');
              const lower = text.toLowerCase();
              
              // Detect Type with Gradients
              let style = { 
                  bg: `bg-gradient-to-r from-${themeColor}-50 to-${themeColor}-100 dark:from-${themeColor}-900/20 dark:to-${themeColor}-800/20`, 
                  border: `border-${themeColor}-300 dark:border-${themeColor}-700`, 
                  text: `text-${themeColor}-900 dark:text-${themeColor}-100`, 
                  icon: '💡', 
                  title: 'Note',
                  accent: `text-${themeColor}-500`
              };
              
              if (lower.includes('**warning**') || lower.includes('**mistake**')) {
                  style = { bg: 'bg-gradient-to-r from-rose-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20', border: 'border-rose-300 dark:border-red-700', text: 'text-rose-900 dark:text-rose-100', icon: '🛑', title: 'Warning', accent: 'text-rose-500' };
              } else if (lower.includes('**tip**') || lower.includes('**hack**')) {
                  style = { bg: 'bg-gradient-to-r from-amber-50 to-orange-100 dark:from-amber-900/20 dark:to-amber-800/20', border: 'border-amber-300 dark:border-amber-700', text: 'text-amber-900 dark:text-amber-100', icon: '✨', title: 'Pro Tip', accent: 'text-amber-500' };
              } else if (lower.includes('**rule**') || lower.includes('**grammar**')) {
                  style = { bg: 'bg-gradient-to-r from-emerald-50 to-green-100 dark:from-emerald-900/20 dark:to-emerald-800/20', border: 'border-emerald-300 dark:border-emerald-700', text: 'text-emerald-900 dark:text-emerald-100', icon: '🧠', title: 'Key Rule', accent: 'text-emerald-500' };
              } else if (lower.includes('**idiom**') || lower.includes('**collocation**')) {
                   style = { bg: 'bg-gradient-to-r from-cyan-50 to-sky-100 dark:from-cyan-900/20 dark:to-cyan-800/20', border: 'border-cyan-300 dark:border-cyan-700', text: 'text-cyan-900 dark:text-cyan-100', icon: '💬', title: 'Vocabulary', accent: 'text-cyan-500' };
              }

              blocks.push(
                  <div key={`quote-${index}`} className={`my-6 p-6 rounded-3xl border-2 ${style.bg} ${style.border} shadow-sm flex flex-col md:flex-row gap-4 relative overflow-hidden`}>
                      <div className={`absolute -right-4 -bottom-4 text-6xl opacity-10 select-none ${style.accent}`}>{style.icon}</div>
                      <div className="text-3xl shrink-0 mt-1 drop-shadow-sm">{style.icon}</div>
                      <div className="flex-1 relative z-10">
                          <p className={`font-medium text-lg leading-relaxed ${style.text} opacity-95`}>{parseInline(text)}</p>
                      </div>
                  </div>
              );
              return;
          }

          // --- LISTS ---
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
              listBuffer.push(
                  <div key={`li-${index}`} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <div className={`mt-2.5 w-1.5 h-1.5 rounded-full bg-${themeColor}-400 group-hover:bg-${themeColor}-600 transition-colors flex-shrink-0`}></div>
                      <span className="font-medium text-slate-700 dark:text-slate-200 text-lg leading-relaxed">
                          {parseInline(trimmed.slice(2))}
                      </span>
                  </div>
              );
              return;
          }

          // --- PARAGRAPH ---
          flushList();
          blocks.push(
              <p key={`p-${index}`} className="text-slate-600 dark:text-slate-300 font-medium text-lg leading-loose mb-6">
                  {parseInline(trimmed)}
              </p>
          );
      });

      flushList();
      flushTable();
      return blocks;
  };

  return <div className={`font-sans ${className}`}>{renderBlocks()}</div>;
};

export default MarkdownRenderer;
