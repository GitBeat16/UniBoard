import { FloraLoader } from "@/components/flora/flora-loader";

/** While Board loads: nothing for 400 ms, then Flora with a trick that fits the screen. */
export default function Loading() {
  return <FloraLoader screen="board" />;
}
