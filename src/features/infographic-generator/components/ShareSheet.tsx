"use client";

/**
 * ShareSheet Component
 *
 * Bottom-sheet overlay offering SMS, email, and link sharing for generated
 * infographic images. Slides up from the bottom with a rounded top, supports
 * the native Web Share API as a fallback, and provides clipboard copy with
 * visual confirmation.
 */

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Mail, Link, Check, X, Share2 } from "lucide-react";

interface ShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  imageData: string;
  imageUrl?: string;
  customerName?: string;
}

export function ShareSheet({
  isOpen,
  onClose,
  imageData,
  imageUrl,
  customerName,
}: ShareSheetProps) {
  const [copied, setCopied] = useState(false);

  // Reset copied state when sheet closes
  useEffect(() => {
    if (!isOpen) setCopied(false);
  }, [isOpen]);

  // --------------------------------------------------------------------------
  // Share handlers
  // --------------------------------------------------------------------------

  const subjectLine = customerName
    ? `Property Briefing for ${customerName}`
    : "Your Property Briefing";

  const bodyText = customerName
    ? `Here is your property briefing for ${customerName}.`
    : "Here is your property briefing.";

  const shareUrl = imageUrl || "";

  const handleSMS = useCallback(() => {
    const smsBody = encodeURIComponent(
      shareUrl ? `${bodyText}\n${shareUrl}` : bodyText,
    );
    window.open(`sms:?body=${smsBody}`, "_self");
  }, [bodyText, shareUrl]);

  const handleEmail = useCallback(() => {
    const subject = encodeURIComponent(subjectLine);
    const body = encodeURIComponent(
      shareUrl ? `${bodyText}\n\n${shareUrl}` : bodyText,
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
  }, [subjectLine, bodyText, shareUrl]);

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("[ShareSheet] Copy link error:", err);
    }
  }, [shareUrl]);

  const handleNativeShare = useCallback(async () => {
    if (!navigator.share) return;

    try {
      await navigator.share({
        title: subjectLine,
        text: bodyText,
        url: shareUrl || undefined,
      });
    } catch (err) {
      // User cancelled share — not an error
      if ((err as Error).name !== "AbortError") {
        console.error("[ShareSheet] Native share error:", err);
      }
    }
  }, [subjectLine, bodyText, shareUrl]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Bottom sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-surface-primary rounded-t-2xl max-h-[50vh] overflow-y-auto"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-surface-secondary" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-2">
              <h3 className="text-lg font-semibold text-text-primary">
                Share Briefing
              </h3>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-surface-secondary transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            {/* Share options */}
            <div className="px-4 pb-6 space-y-1">
              {/* SMS */}
              <button
                onClick={handleSMS}
                className="flex items-center gap-4 w-full p-3 rounded-lg hover:bg-surface-secondary transition-colors text-left"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/10">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-text-primary">Send via SMS</p>
                  <p className="text-sm text-text-secondary">
                    Open messaging app
                  </p>
                </div>
              </button>

              {/* Email */}
              <button
                onClick={handleEmail}
                className="flex items-center gap-4 w-full p-3 rounded-lg hover:bg-surface-secondary transition-colors text-left"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/10">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-text-primary">
                    Send via Email
                  </p>
                  <p className="text-sm text-text-secondary">
                    Open email client
                  </p>
                </div>
              </button>

              {/* Copy Link */}
              <button
                onClick={handleCopyLink}
                disabled={!shareUrl}
                className="flex items-center gap-4 w-full p-3 rounded-lg hover:bg-surface-secondary transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-500/10">
                  {copied ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Link className="w-5 h-5 text-purple-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-text-primary">
                    {copied ? "Link Copied!" : "Copy Link"}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {shareUrl
                      ? "Copy shareable link to clipboard"
                      : "No shareable link available"}
                  </p>
                </div>
              </button>

              {/* Native share (if available) */}
              {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                <button
                  onClick={handleNativeShare}
                  className="flex items-center gap-4 w-full p-3 rounded-lg hover:bg-surface-secondary transition-colors text-left"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-500/10">
                    <Share2 className="w-5 h-5 text-text-secondary" />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">
                      More options...
                    </p>
                    <p className="text-sm text-text-secondary">
                      Use system share menu
                    </p>
                  </div>
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
