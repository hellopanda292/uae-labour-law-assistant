import type { Metadata } from "next";
import { GratuityCalculator } from "@/components/GratuityCalculator";

export const metadata: Metadata = {
  title: "Gratuity calculator",
  description: "Calculate your UAE end-of-service gratuity under Article 51 of the Labour Law, with every step and article shown.",
};

export default function GratuityPage() {
  return (
    <div className="container-app pt-10">
      <p className="eyebrow">Article 51 · exact calculation</p>
      <h1 className="mt-2 font-display text-[clamp(2rem,5vw,3rem)] font-bold tracking-[-0.02em]">End-of-service gratuity</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        A foreign full-time worker with at least one year of service gets 21 days of basic wage for each of the first five years and 30 days for
        each year after, in proportion for part of a year, up to two years&apos; wage. This calculator follows the law step by step.
      </p>
      <div className="mt-8">
        <GratuityCalculator />
      </div>
    </div>
  );
}
