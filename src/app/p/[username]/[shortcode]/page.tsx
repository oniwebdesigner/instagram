import type { Metadata } from "next";
import { PostView, postMetadata } from "@/lib/post-view";

export const instant = false;

type Props = {
  params: Promise<{ username: string; shortcode: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, shortcode } = await params;
  return postMetadata(username, shortcode);
}

export default async function PostPage({ params }: Props) {
  const { username, shortcode } = await params;
  return <PostView username={username} shortcode={shortcode} />;
}
