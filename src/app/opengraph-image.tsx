import { ImageResponse } from "next/og";
import { OgCard } from "@/components/og/Card";

export const alt = "Sarkar Graph: every seat of power in India, traced back to the voter";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<OgCard title="Every seat of power in India, traced back to the voter." sub="Union, Parliament, courts, commissions and all 36 States and UTs. Live." />, size);
}
