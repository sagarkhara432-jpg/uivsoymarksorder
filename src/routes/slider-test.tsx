import { createFileRoute } from "@tanstack/react-router";
import SwipeToConfirm from "@/components/SwipeToConfirm";
import { useState } from "react";

export const Route = createFileRoute("/slider-test")({ component: T });

function T() {
  const [n, setN] = useState(0);
  return (
    <div className="p-6">
      <div data-testid="count">{n}</div>
      <SwipeToConfirm label="Slide to Accept" onConfirm={() => setN((v) => v + 1)} />
    </div>
  );
}
