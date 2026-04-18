"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";

const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), "className"],
    span: [...(defaultSchema.attributes?.span || []), "className"],
  },
};

export const AssistantMarkdown = React.memo(function AssistantMarkdown({
  content,
}: {
  content: string;
}) {
  return (
    <div className="assistant-md text-sm leading-relaxed text-secondary-foreground prose prose-invert prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, [rehypeSanitize, schema]]}
      >
        {content || ""}
      </ReactMarkdown>
    </div>
  );
});
