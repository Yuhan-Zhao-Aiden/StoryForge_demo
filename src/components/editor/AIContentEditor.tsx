"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, AlertCircle, History } from "lucide-react";
import {
  GenerationHistoryDialog,
  type GenerationHistoryItem,
} from "./GenerationHistoryDialog";

interface AIContentEditorProps {
  roomId: string;
  nodeId: string;
  nodeType: "scene" | "choice" | "ending" | "note";
  value: string;
  onChange: (value: string) => void;
  onGenerate?: (generatedContent: string, prompt: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function AIContentEditor({
  roomId,
  nodeId,
  nodeType,
  value,
  onChange,
  onGenerate,
  disabled = false,
  placeholder = "Write your content here, or enter a prompt and click Generate to use AI...",
}: AIContentEditorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState("");
  const [generationHistory, setGenerationHistory] = useState<GenerationHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!value.trim() || disabled) return;

    setIsGenerating(true);
    setGenerationError(null);
    setLastPrompt(value); // Save the prompt for potential re-generation

    try {
      const response = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          nodeId,
          prompt: value,
          nodeType,
          options: {
            temperature: 0.7,
            maxTokens: 1000,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle rate limiting
        if (response.status === 429) {
          const resetDate = data.resetAt ? new Date(data.resetAt) : null;
          const resetTime = resetDate
            ? resetDate.toLocaleTimeString()
            : "later";
          throw new Error(
            `Rate limit exceeded. Try again at ${resetTime}.`
          );
        }
        throw new Error(data.error || "Failed to generate content");
      }

      if (data.success && data.content) {
        // Update the content with generated text
        onChange(data.content);
        
        // Add to generation history
        const historyItem: GenerationHistoryItem = {
          id: crypto.randomUUID(),
          prompt: value,
          content: data.content,
          generatedAt: new Date(),
          tokens: data.usage?.totalTokens,
        };
        setGenerationHistory((prev) => [historyItem, ...prev]);
        
        // Notify parent component about the generation
        if (onGenerate) {
          onGenerate(data.content, value);
        }

        // Clear error on success
        setGenerationError(null);
      } else {
        throw new Error(data.error || "No content generated");
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to generate content. Please try again.";
      setGenerationError(message);
      console.error("Content generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [value, disabled, roomId, nodeId, nodeType, onChange, onGenerate]);

  const handleRestorePrompt = useCallback(() => {
    if (lastPrompt) {
      onChange(lastPrompt);
      setGenerationError(null);
    }
  }, [lastPrompt, onChange]);

  const handleSelectFromHistory = useCallback(
    (item: GenerationHistoryItem) => {
      onChange(item.content);
      if (onGenerate) {
        onGenerate(item.content, item.prompt);
      }
    },
    [onChange, onGenerate]
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || isGenerating}
          placeholder={placeholder}
          className="min-h-32 resize-y pr-24"
        />
        <Button
          type="button"
          size="sm"
          onClick={handleGenerate}
          disabled={disabled || isGenerating || !value.trim()}
          className="absolute bottom-2 right-2 gap-1.5"
          variant="secondary"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate
            </>
          )}
        </Button>
      </div>

      {generationError && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div className="flex-1">
            <p>{generationError}</p>
            {lastPrompt && (
              <Button
                type="button"
                size="sm"
                variant="link"
                onClick={handleRestorePrompt}
                className="mt-1 h-auto p-0 text-xs text-destructive underline"
              >
                Restore original prompt
              </Button>
            )}
          </div>
        </div>
      )}

      {lastPrompt && value !== lastPrompt && !generationError && (
        <div className="flex items-center justify-between rounded-md border border-muted bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <div className="flex w-full justify-between">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleRestorePrompt}
              className="h-auto px-2 py-1 text-xs"
            >
              Restore prompt
            </Button>
            {generationHistory.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowHistory(true)}
                className="h-auto px-2 py-1 text-xs gap-1"
              >
                <History className="h-3 w-3" />
                View History
              </Button>
            )}
          </div>
        </div>
      )}

      <GenerationHistoryDialog
        open={showHistory}
        onOpenChange={setShowHistory}
        history={generationHistory}
        onSelect={handleSelectFromHistory}
      />
    </div>
  );
}
