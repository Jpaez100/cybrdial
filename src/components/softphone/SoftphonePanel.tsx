import { ActiveCallCard } from "./ActiveCallCard";
import { Dialpad } from "./Dialpad";

export function SoftphonePanel() {
  return (
    <div className="space-y-4">
      <ActiveCallCard />
      <Dialpad />
    </div>
  );
}
