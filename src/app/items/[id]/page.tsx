import type { Metadata } from "next";
import { ItemDetail } from "@/components/feedback/item-detail";

export const metadata: Metadata = {
  title: "Idea · Ent Feedback",
};

export const instant = false;

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ItemDetail id={id} />;
}
