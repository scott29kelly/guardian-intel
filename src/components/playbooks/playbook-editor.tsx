"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import Markdown from "react-markdown";
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

  // Markdown component styles
  const markdownComponents = {
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className="text-2xl font-bold mt-6 mb-4 text-text-primary">{children}</h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="text-xl font-bold mt-6 mb-3 text-text-primary">{children}</h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="text-lg font-semibold mt-4 mb-2 text-text-primary">{children}</h3>
    ),
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className="my-3 text-text-secondary leading-relaxed">{children}</p>
    ),
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="text-text-primary">{children}</strong>
    ),
    em: ({ children }: { children?: React.ReactNode }) => (
      <em className="text-text-secondary">{children}</em>
    ),
    code: ({ children }: { children?: React.ReactNode }) => (
      <code className="px-1.5 py-0.5 bg-surface-secondary rounded text-accent-primary text-sm">{children}</code>
    ),
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="border-l-4 border-accent-primary pl-4 py-2 my-3 bg-accent-primary/5 text-text-secondary italic">{children}</blockquote>
    ),
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
      <a href={href} className="text-accent-primary hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="my-3 space-y-1 list-disc ml-4">{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="my-3 space-y-1 list-decimal ml-4">{children}</ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
      <li className="text-text-secondary">{children}</li>
    ),
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
        <div className="prose prose-invert max-w-none">
          <Markdown components={markdownComponents}>{content}</Markdown>
        </div>
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
            <div className="prose prose-invert max-w-none">
              <Markdown components={markdownComponents}>{content}</Markdown>
            </div>
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
