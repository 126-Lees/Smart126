"use client";
import { useState, useRef } from "react";
import { useSearchParams } from "next/navigation";

async function publish(payload: object) {
  try {
    await fetch("/api/iot/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("[Remote] Publish failed", e);
  }
}

// ========== Global cooldown hook ==========
function useCooldown(ms: number = 1500) {
  const cooling = useRef(false);

  function trigger(fn: () => void) {
    if (cooling.current) return;
    cooling.current = true;
    fn();
    setTimeout(() => {
      cooling.current = false;
    }, ms);
  }

  return trigger;
}

// ========== Fan Button ==========
function FanButton({ label, onClick }: { label: string; onClick: () => void }) {
  const [lit, setLit] = useState(false);
  const [pressed, setPressed] = useState(false);

  function handleClick() {
    setPressed(true);
    setLit(true);
    setTimeout(() => setPressed(false), 160);
    setTimeout(() => setLit(false), 600);
    onClick();
  }

  return (
    <button
      onClick={handleClick}
      style={{ transform: pressed ? "scale(0.97)" : "scale(1)" }}
      className="w-full h-12 rounded-[10px] border border-[#b0aca7] bg-[#dedad5] flex items-center px-4 gap-3 cursor-pointer transition-colors duration-75 active:bg-[#ccc8c3]"
    >
      <div
        className="w-[22px] h-[13px] rounded-sm flex-shrink-0 transition-colors duration-150"
        style={{
          background: lit ? "#60aa30" : "#888",
          border: lit ? "1px solid #408010" : "1px solid #666",
        }}
      />
      <span className="text-xs font-medium tracking-widest uppercase text-[#555] flex-1 text-left">
        {label}
      </span>
    </button>
  );
}

// ========== Aircon Remote ==========
function AirconRemote({
  trigger,
  deviceName,
}: {
  trigger: (fn: () => void) => void;
  deviceName: string;
}) {
  const [temp, setTemp] = useState(25);
  const [pressed, setPressed] = useState<string | null>(null);
  const [screenOn, setScreenOn] = useState(true);

  function flash(key: string) {
    setPressed(key);
    setTimeout(() => setPressed(null), 160);
  }

  function handleOn() {
    trigger(() => {
      flash("on");
      setScreenOn(true);
      publish({ device: deviceName, signal: { temperature: temp } });
    });
  }

  function handleOff() {
    trigger(() => {
      flash("off");
      setScreenOn(false);
      publish({ device: deviceName, signal: { power: "off" } });
    });
  }

  function handleTempUp() {
    if (temp >= 31) return;
    trigger(() => {
      flash("up");
      const next = temp + 1;
      setTemp(next);
      publish({ device: deviceName, signal: { temperature: next } });
    });
  }

  function handleTempDown() {
    if (temp <= 16) return;
    trigger(() => {
      flash("down");
      const next = temp - 1;
      setTemp(next);
      publish({ device: deviceName, signal: { temperature: next } });
    });
  }

  const scale = (key: string) => ({
    transform: pressed === key ? "scale(0.94)" : "scale(1)",
    transition: "transform 0.08s ease",
  });

  return (
    <div
      className="w-full flex flex-col items-center p-5 pb-6"
      style={{
        maxWidth: 320,
        background: "#e8e4df",
        borderRadius: "24px 24px 32px 32px",
        border: "1.5px solid #c8c4bf",
      }}
    >
      <p className="text-[11px] text-[#888] tracking-widest uppercase mb-3">
        Aircon
      </p>

      {/* Display */}
      <div
        className="w-full flex items-center justify-center mb-4 transition-colors duration-300"
        style={{
          height: 80,
          background: screenOn ? "#b8d4c0" : "#c8c4bf",
          borderRadius: 8,
          border: `1px solid ${screenOn ? "#90b09a" : "#b0aca7"}`,
        }}
      >
        {screenOn ? (
          <div className="flex items-baseline gap-1">
            <span
              className="font-medium text-[#1a3a24] leading-none"
              style={{ fontSize: 44, letterSpacing: -2 }}
            >
              {temp}
            </span>
            <span className="text-[20px] font-medium text-[#2a5a34]">°C</span>
          </div>
        ) : (
          <span className="text-[13px] text-[#888] tracking-widest uppercase">
            Off
          </span>
        )}
      </div>

      <div className="w-full flex flex-col gap-2">
        {/* On / Off */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleOn}
            style={scale("on")}
            className="h-12 rounded-[10px] border border-[#e07020] bg-[#f0d0b0] flex items-center justify-center gap-2 cursor-pointer active:bg-[#e0b890]"
          >
            <div className="w-[9px] h-[9px] rounded-full bg-[#e07020]" />
            <span className="text-xs font-medium uppercase tracking-widest text-[#6a3010]">
              On
            </span>
          </button>
          <button
            onClick={handleOff}
            style={scale("off")}
            className="h-12 rounded-[10px] border border-[#b0aca7] bg-[#dedad5] flex items-center justify-center gap-2 cursor-pointer active:bg-[#ccc8c3]"
          >
            <div className="w-[9px] h-[9px] rounded-full bg-[#888]" />
            <span className="text-xs font-medium uppercase tracking-widest text-[#555]">
              Off
            </span>
          </button>
        </div>

        {/* Temp Up / Down */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleTempUp}
            style={scale("up")}
            className="h-14 rounded-[10px] border border-[#b0aca7] bg-[#dedad5] flex items-center justify-center cursor-pointer active:bg-[#ccc8c3] text-[22px] text-[#c03030]"
          >
            ▲
          </button>
          <button
            onClick={handleTempDown}
            style={scale("down")}
            className="h-14 rounded-[10px] border border-[#b0aca7] bg-[#dedad5] flex items-center justify-center cursor-pointer active:bg-[#ccc8c3] text-[22px] text-[#2060c0]"
          >
            ▼
          </button>
        </div>
      </div>
    </div>
  );
}

// ========== Fan Remote ==========
function FanRemote({
  trigger,
  deviceName,
}: {
  trigger: (fn: () => void) => void;
  deviceName: string;
}) {
  return (
    <div
      className="w-full flex flex-col items-center p-5 pb-6"
      style={{
        maxWidth: 320,
        background: "#e8e4df",
        borderRadius: "24px 24px 32px 32px",
        border: "1.5px solid #c8c4bf",
      }}
    >
      <p className="text-[11px] text-[#888] tracking-widest uppercase mb-3">
        Wall Fan
      </p>

      {/* Grille */}
      <div
        className="w-full flex items-center justify-center mb-4 overflow-hidden relative"
        style={{
          maxWidth: 280,
          height: 90,
          background: "#ccc8c3",
          borderRadius: 10,
          border: "1px solid #b8b4af",
        }}
      >
        <div
          className="grid gap-[3px]"
          style={{ gridTemplateColumns: "repeat(14, 10px)" }}
        >
          {Array.from({ length: 70 }).map((_, i) => (
            <div
              key={i}
              className="w-[5px] h-[5px] rounded-full bg-[#b0aca7]"
            />
          ))}
        </div>
        <div
          className="absolute flex items-center justify-center text-white font-medium"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#c0392b",
            border: "2px solid #96281b",
            fontSize: 9,
          }}
        >
          KDK
        </div>
      </div>

      {/* Buttons */}
      <div className="w-full flex flex-col gap-2">
        {[
          { label: "Off / On", key: "power" },
          { label: "Speed", key: "speed" },
          { label: "Oscil", key: "oscillation" },
          { label: "Timer", key: "timer" },
        ].map((b) => (
          <FanButton
            key={b.key}
            label={b.label}
            onClick={() =>
              trigger(() =>
                publish({ device: deviceName, signal: { [b.key]: "toggle" } }),
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

// ========== Page ==========
export default function RemotePage() {
  const trigger = useCooldown(500);
  const searchParams = useSearchParams();

  const user = searchParams.get("user") ?? "unknown";
  const displayName =
    user.charAt(0).toUpperCase() + user.slice(1).toLowerCase();

  const airconDevice = `${user}-aircon`;
  const fanDevice = `${user}-fan`;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-start py-8 px-4 gap-5">
      <h1 className="text-2xl font-semibold text-gray-700 tracking-tight">
        {displayName}'s Room
      </h1>
      <AirconRemote trigger={trigger} deviceName={airconDevice} />
      <FanRemote trigger={trigger} deviceName={fanDevice} />
    </div>
  );
}
