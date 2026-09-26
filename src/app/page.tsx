import { Explorer } from "@/components/Explorer";
import { readGovs } from "@/lib/server/graphs";

export default function Home() {
  return <Explorer gov="in" initialSelected={null} govs={readGovs()} />;
}
