import { pipeline } from "@xenova/transformers";

type Pipeline = Awaited<ReturnType<typeof pipeline>>;

let embedderPromise: Promise<Pipeline> | null = null;

function getEmbedder(): Promise<Pipeline> {
  if (!embedderPromise) {
    embedderPromise = pipeline(
      "feature-extraction",
      "Xenova/all-mpnet-base-v2",
    );
  }
  return embedderPromise;
}

export async function embedText(text: string): Promise<number[]> {
  const embedder = await getEmbedder();
  const out = await embedder(text, { pooling: "mean", normalize: true });
  return Array.from(out.data as Float32Array);
}

export function vectorLiteral(arr: number[]): string {
  return `[${arr.join(",")}]`;
}
