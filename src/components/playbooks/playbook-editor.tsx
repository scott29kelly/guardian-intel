"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Quote,
  Code,
  Link,
  Eye,
  Edit3,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface PlaybookEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  minHeight?: string;
  readOnly?: boolean;
}

export function PlaybookEditor({
  content,
  onChange,
  placeholder = "Write your playbook content here...\n\nYou can use Markdown formatting:\n- **Bold text**\n- *Italic text*\n- ## Headings\n- > Quotes\n- - Lists",
  minHeight = "300px",
  readOnly = false,
}: PlaybookEditorProps) {
  const { showToast } = useToast();
  const [isPreview, setIsPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const insertMarkdown = useCallback((prefix: string, suffix: string = "", placeholder: string = "") => {
    const textarea = document.getElementById("playbook-editor") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || placeholder;
    
    const newContent = 
      content.substring(0, start) + 
      prefix + selectedText + suffix + 
      content.substring(end);
    
    onChange(newContent);
    
    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [content, onChange]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    showToast("success", "Copied!", "Content copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const toolbarActions = [
    { icon: Bold, action: () => insertMarkdown("**", "**", "bold text"), title: "Bold" },
    { icon: Italic, action: () => insertMarkdown("*", "*", "italic text"), title: "Italic" },
    { icon: Heading2, action: () => insertMarkdown("\n## ", "\n", "Heading"), title: "Heading" },
    { icon: Quote, action: () => insertMarkdown("\n> ", "\n", "Quote"), title: "Quote" },
    { icon: List, action: () => insertMarkdown("\n- ", "\n", "List item"), title: "Bullet List" },
    { icon: ListOrdered, action: () => insertMarkdown("\n1. ", "\n", "List item"), title: "Numbered List" },
    { icon: Code, action: () => insertMarkdown("`", "`", "code"), title: "Inline Code" },
    { icon: Link, action: () => insertMarkdown("[", "](url)", "link text"), title: "Link" },
  ];

  // Simple Markdown to HTML renderer
  const renderMarkdown = (text: string): string => {
    let html = text
      // Escape HTML
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      // Headers
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2 text-text-primary">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3 text-text-primary">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4 text-text-primary">$1</h1>')
      // Bold & Italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-text-primary">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em class="text-text-secondary">$1</em>')
      // Code
      .replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 bg-surface-secondary rounded text-accent-primary text-sm">$1</code>')
      // Blockquotes
      .replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-4 border-accent-primary pl-4 py-2 my-3 bg-accent-primary/5 text-text-secondary italic">$1</blockquote>')
      // Links
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-accent-primary hover:underline" target="_blank" rel="noopener">$1</a>')
      // Lists - unordered
      .replace(/^- (.+)$/gm, '<li class="ml-4 text-text-secondary">$1</li>')
      // Lists - ordered
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-text-secondary list-decimal">$1</li>')
      // Paragraphs (double newlines)
      .replace(/\n\n/g, '</p><p class="my-3 text-text-secondary leading-relaxed">')
      // Single newlines in content
      .replace(/\n/g, '<br />');
    
    // Wrap in paragraph
    html = `<p class="my-3 text-text-secondary leading-relaxed">${html}</p>`;
    
    // Wrap consecutive li elements in ul
    html = html.replace(/(<li[^>]*>.*?<\/li>)+/g, '<ul class="my-3 space-y-1 list-disc">$&</ul>');
    
    return html;
  };

  if (readOnly) {
    return (
      <div className="relative">
        <div className="flex items-center justify-end mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="text-text-muted hover:text-text-primary"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </Button>
        </div>
        <div 
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-surface-secondary/30">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface-secondary/50">
        <div className="flex items-center gap-1">
          {toolbarActions.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={item.action}
              title={item.title}
              className="p-1.5 rounded hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors"
            >
              <item.icon className="w-4 h-4" />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors"
            title="Copy content"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setIsPreview(false)}
              className={`px-3 py-1 text-xs transition-colors ${
                !isPreview 
                  ? "bg-accent-primary text-white" 
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <Edit3 className="w-3 h-3 inline mr-1" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => setIsPreview(true)}
              className={`px-3 py-1 text-xs transition-colors ${
                isPreview 
                  ? "bg-accent-primary text-white" 
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <Eye className="w-3 h-3 inline mr-1" />
              Preview
            </button>
          </div>
        </div>
      </div>

      {/* Editor / Preview */}
      {isPreview ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 overflow-y-auto"
          style={{ minHeight }}
        >
          {content ? (
            <div 
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
          ) : (
            <p className="text-text-muted italic">Nothing to preview yet...</p>
          )}
        </motion.div>
      ) : (
        <motion.textarea
          id="playbook-editor"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full p-4 bg-transparent text-text-primary placeholder:text-text-muted focus:outline-none resize-none font-mono text-sm leading-relaxed"
          style={{ minHeight }}
        />
      )}
    </div>
  );
}
