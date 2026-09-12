"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReviewHistoryTab } from "@/components/history/review-history-tab";
import { PlagiarismHistoryTab } from "@/components/history/plagiarism-history-tab";

export function HistoryTabs() {
  const [tab, setTab] = useState("reviews");

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="reviews">Code Reviews</TabsTrigger>
        <TabsTrigger value="plagiarism">Plagiarism Checks</TabsTrigger>
      </TabsList>
      <TabsContent value="reviews">
        <ReviewHistoryTab />
      </TabsContent>
      <TabsContent value="plagiarism">
        <PlagiarismHistoryTab />
      </TabsContent>
    </Tabs>
  );
}
