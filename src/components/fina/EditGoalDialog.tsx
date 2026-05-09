import { useState, useEffect } from "react";
import {
  X,
  Target,
  Laptop,
  Plane,
  ShieldCheck,
  GraduationCap,
  Car,
  Heart,
  Wallet,
} from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Goal } from "@/contexts/GoalsContext";

const ICON_OPTIONS = [
  { name: "Target", icon: Target },
  { name: "Laptop", icon: Laptop },
  { name: "Plane", icon: Plane },
  { name: "ShieldCheck", icon: ShieldCheck },
  { name: "GraduationCap", icon: GraduationCap },
  { name: "Car", icon: Car },
  { name: "Heart", icon: Heart },
  { name: "Wallet", icon: Wallet },
];

const COLOR_OPTIONS = [
  "#3b82f6",
  "#f97316",
  "#00c896",
  "#8b5cf6",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
  "#eab308",
];

interface EditGoalDialogProps {
  open: boolean;
  goal: Goal | null;
  onClose: () => void;
  onGoalUpdated: (id: string, updates: Partial<Goal>) => void;
}

const EditGoalDialog = ({
  open,
  goal,
  onClose,
  onGoalUpdated,
}: EditGoalDialogProps) => {
  const { currency } = useCurrency();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("Target");
  const [selectedColor, setSelectedColor] = useState("#3b82f6");

  useEffect(() => {
    if (goal) {
      setName(goal.name);
      setTarget(String(parseFloat((goal.target / currency.rate).toFixed(2))));
      setSaved(String(parseFloat((goal.saved / currency.rate).toFixed(2))));
      setDeadline(goal.deadline === "No deadline" ? "" : goal.deadline);
      setSelectedIcon(goal.icon);
      setSelectedColor(goal.color);
    }
  }, [goal, currency.rate]);

  // ← ADD THIS — must be after all hooks
  if (!open || !goal) return null;

  // handleSubmit — multiply back to MYR when saving
  const handleSubmit = () => {
    if (!name || !target || !goal) return;
    onGoalUpdated(goal.id, {
      name,
      icon: selectedIcon,
      // user typed in display currency → multiply back to MYR
      target: parseFloat((parseFloat(target) * currency.rate).toFixed(2)),
      saved: parseFloat((parseFloat(saved) * currency.rate).toFixed(2)),
      color: selectedColor,
      deadline: deadline || "No deadline",
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl p-5 w-full max-w-sm shadow-xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-bold text-foreground">Edit Goal</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
              Goal Name
            </label>
            <input
              className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-border text-[13px] text-foreground bg-card outline-none focus:border-primary transition-colors"
              placeholder="e.g. New Laptop"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                Target ({currency.symbol})
              </label>
              <input
                type="number"
                className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-border text-[13px] text-foreground bg-card outline-none focus:border-primary transition-colors"
                placeholder="e.g. 3500"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                Saved ({currency.symbol})
              </label>
              <input
                type="number"
                className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-border text-[13px] text-foreground bg-card outline-none focus:border-primary transition-colors"
                placeholder="e.g. 500"
                value={saved}
                onChange={(e) => setSaved(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
              Deadline (optional)
            </label>
            <input
              className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-border text-[13px] text-foreground bg-card outline-none focus:border-primary transition-colors"
              placeholder="e.g. Dec 2026"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground mb-1.5 block">
              Icon
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {ICON_OPTIONS.map((opt) => (
                <button
                  key={opt.name}
                  onClick={() => setSelectedIcon(opt.name)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    selectedIcon === opt.name
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <opt.icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground mb-1.5 block">
              Color
            </label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    selectedColor === c
                      ? "border-foreground scale-110"
                      : "border-transparent"
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {/* Progress preview */}
          <div className="bg-muted rounded-xl p-3">
            <div className="flex justify-between mb-1.5">
              <span className="text-[11px] text-muted-foreground">
                Progress preview
              </span>
              <span
                className="text-[11px] font-semibold"
                style={{ color: selectedColor }}
              >
                {Math.min(
                  100,
                  Math.round(
                    ((parseFloat(saved) || 0) / (parseFloat(target) || 1)) *
                      100,
                  ),
                )}
                %
              </span>
            </div>
            <div className="h-2 bg-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.round(((parseFloat(saved) || 0) / (parseFloat(target) || 1)) * 100))}%`,
                  background: `linear-gradient(90deg, ${selectedColor}90, ${selectedColor})`,
                }}
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!name || !target}
            className="w-full gradient-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm shadow-primary hover:shadow-primary-hover transition-all mt-1 disabled:opacity-50"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditGoalDialog;
