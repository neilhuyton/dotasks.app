import { useEffect, useState } from "react";
import { GlobalFetchingIndicator } from "@steel-cut/steel-lib";

export function SafeQueryIndicator(
  props: Parameters<typeof GlobalFetchingIndicator>[0],
) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Delay one tick to let provider context propagate
    const timer = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) return null;

  return <GlobalFetchingIndicator {...props} />;
}
