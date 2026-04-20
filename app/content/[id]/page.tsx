import { ContentItemPageClient } from "@/components/veya/content-item-page-client";
import { getContentById } from "@/data/content-items";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const bundle = getContentById(id);
  return {
    title: bundle ? `${bundle.item.title} | Veya` : "Content | Veya"
  };
}

export default async function ContentItemPage({ params }: PageProps) {
  const { id } = await params;
  const bundle = getContentById(id);
  return <ContentItemPageClient id={id} initialBundle={bundle ?? null} />;
}
