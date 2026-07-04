"use client";

import React from "react";
import { Markdown } from "@/components/ui/Markdown";

export const AssistantMarkdown = React.memo(function AssistantMarkdown({
  content,
}: {
  content: string;
}) {
  return <Markdown>{content || ""}</Markdown>;
});
