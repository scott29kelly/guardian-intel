"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Sparkles,
  MessageSquare,
  Target,
  Lightbulb,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface PlaybookEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  minHeight?: string;
  readOnly?: boolean;
  playbookContext?: {
    title: string;
    category: string;
    type: string;
    stage?: string;
  };
}

type AIGenerateAction = {
  id: string;
  label: string;
  icon: React.ElementType;
  action: string;
};

const aiGenerateActions: AIGenerateAction[] = [
  { id: "opening", label: "Generate Opening Script", icon: MessageSquare, action: "add_opening" },
  { id: "objections", label: "Add Objection Handlers", icon: MessageSquare, action: "add_objections" },
  { id: "closing", label: "Write Closing Script", icon: Target, action: "add_closing" },
  { id: "tips", label: "Generate Pro Tips", icon: Lightbulb, action: "add_tips" },
  { id: "expand", label: "Expand This Section", icon: Sparkles, action: "expand" },
  { id: "conversational", label: "Make More Conversational", icon: MessageSquare, action: "make_conversational" },
  { id: "insurance", label: "Add Insurance Context", icon: Sparkles, action: "add_insurance_context" },
];

export function PlaybookEditor({
  content,
  onChange,
  placeholder = "Write your playbook content here...\n\nYou can use Markdown formatting:\n- **Bold text**\n- *Italic text*\n- ## Headings\n- > Quotes\n- - Lists",
  minHeight = "300px",
  readOnly = false,
  playbookContext,
}: PlaybookEditorProps) {
  const { showToast } = useToast();
  const [isPreview, setIsPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAIMenu, setShowAIMenu] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const aiMenuRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

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

  const handleAIGenerate = async (action: AIGenerateAction) => {
    if (!playbookContext) {
      showToast("info", "Missing Context", "Save the playbook first to use AI");
      return;
    }

    setIsAILoading(true);
    setLoadingAction(action.id);
    setShowAIMenu(false);

    try {
      const response = await fetch("/api/ai/playbook-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: action.action,
          title: playbookContext.title,
          category: playbookContext.category,
          type: playbookContext.type,
          stage: playbookContext.stage,
          existingContent: content,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate content");
      }

      // Append the generated content
      const newContent = content 
        ? `${content}\n\n${data.content}`
        : data.content;
      
      onChange(newContent);
      showToast("success", "Content Generated", "AI content has been added to your playbook");

      // Scroll to bottom of editor
      if (editorRef.current) {
        editorRef.current.scrollTop = editorRef.current.scrollHeight;
      }
    } catch (error) {
      showToast(
        "error",
        "AI Error",
        error instanceof Error ? error.message : "Failed to generate content"
      );
    } finally {
      setIsAILoading(false);
      setLoadingAction(null);
    }
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
          
          {/* Separator */}
          <div className="w-px h-5 bg-border mx-1" />
          
          {/* AI Generate Dropdown */}
          <div className="relative" ref={aiMenuRef}>
            <button
              type="button"
              onClick={() => setShowAIMenu(!showAIMenu)}
              disabled={isAILoading}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-purple-500/10 text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
              title="AI Generate"
            >
              {isAILoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span className="text-xs font-medium">AI</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            
            <AnimatePresence>
              {showAIMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute left-0 top-full mt-1 z-50 w-56 bg-surface-primary border border-border rounded-lg shadow-xl overflow-hidden"
                >
                  <div className="p-2 border-b border-border bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-xs font-medium text-text-primary">
                        Generate Content
                      </span>
                    </div>
                  </div>
                  <div className="p-1 max-h-64 overflow-y-auto">
                    {aiGenerateActions.map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => handleAIGenerate(action)}
                        disabled={isAILoading}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left rounded hover:bg-surface-hover transition-colors disabled:opacity-50"
                      >
                        <action.icon className="w-4 h-4 text-text-muted" />
                        <span className="text-sm text-text-primary">{action.label}</span>
                        {loadingAction === action.id && (
                          <Loader2 className="w-3 h-3 animate-spin text-purple-400 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
          ref={editorRef}
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
