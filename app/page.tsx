"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const VALID_USERS = {
  validUsers: ["jeffrey", "jordan"],
};

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

function AirconRemote({
  trigger,
  deviceName,
}: {
  trigger: (fn: () => void) => void;
  deviceName: string;
}) {
  const storageKey = `aircon-settings-${deviceName}`;

  const [temp, setTemp] = useState(25);
  const [fanSpeed, setFanSpeed] = useState(1);
  const [pressed, setPressed] = useState<string | null>(null);
  const [screenOn, setScreenOn] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;

    try {
      const settings = JSON.parse(saved);
      if (typeof settings.temperature === "number")
        setTemp(settings.temperature);
      if (typeof settings.fanSpeed === "number") setFanSpeed(settings.fanSpeed);
      if (typeof settings.screenOn === "boolean")
        setScreenOn(settings.screenOn);
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  function saveSettings(next: {
    temperature?: number;
    fanSpeed?: number;
    screenOn?: boolean;
  }) {
    const updated = {
      temperature: next.temperature ?? temp,
      fanSpeed: next.fanSpeed ?? fanSpeed,
      screenOn: next.screenOn ?? screenOn,
    };

    localStorage.setItem(storageKey, JSON.stringify(updated));
  }

  function flash(key: string) {
    setPressed(key);
    setTimeout(() => setPressed(null), 160);
  }

  function handleOn() {
    trigger(() => {
      flash("on");
      setScreenOn(true);
      saveSettings({ screenOn: true });

      publish({
        device: deviceName,
        signal: {
          power: "on",
          temperature: temp,
          fan: fanSpeed,
        },
      });
    });
  }

  function handleOff() {
    trigger(() => {
      flash("off");
      setScreenOn(false);
      saveSettings({ screenOn: false });

      publish({ device: deviceName, signal: { power: "off" } });
    });
  }

  function handleTempUp() {
    if (temp >= 31) return;

    trigger(() => {
      flash("up");
      const next = temp + 1;
      setTemp(next);
      setScreenOn(true);
      saveSettings({ temperature: next, screenOn: true });

      publish({
        device: deviceName,
        signal: {
          power: "on",
          temperature: next,
          fan: fanSpeed,
        },
      });
    });
  }

  function handleTempDown() {
    if (temp <= 16) return;

    trigger(() => {
      flash("down");
      const next = temp - 1;
      setTemp(next);
      setScreenOn(true);
      saveSettings({ temperature: next, screenOn: true });

      publish({
        device: deviceName,
        signal: {
          power: "on",
          temperature: next,
          fan: fanSpeed,
        },
      });
    });
  }

  function handleFanSpeed() {
    trigger(() => {
      const next = fanSpeed >= 4 ? 1 : fanSpeed + 1;
      flash("fanSpeed");
      setFanSpeed(next);
      setScreenOn(true);
      saveSettings({ fanSpeed: next, screenOn: true });

      publish({
        device: deviceName,
        signal: {
          power: "on",
          temperature: temp,
          fan: next,
        },
      });
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

      <div
        className="w-full flex flex-col items-center justify-center mb-4 transition-colors duration-300"
        style={{
          height: 90,
          background: screenOn ? "#b8d4c0" : "#c8c4bf",
          borderRadius: 8,
          border: `1px solid ${screenOn ? "#90b09a" : "#b0aca7"}`,
        }}
      >
        {screenOn ? (
          <>
            <div className="flex items-baseline gap-1">
              <span
                className="font-medium text-[#1a3a24] leading-none"
                style={{ fontSize: 44, letterSpacing: -2 }}
              >
                {temp}
              </span>
              <span className="text-[20px] font-medium text-[#2a5a34]">°C</span>
            </div>
            <span className="text-[11px] text-[#2a5a34] tracking-widest uppercase">
              Fan Speed {fanSpeed}
            </span>
          </>
        ) : (
          <span className="text-[13px] text-[#888] tracking-widest uppercase">
            Off
          </span>
        )}
      </div>

      <div className="w-full flex flex-col gap-2">
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

        <button
          onClick={handleFanSpeed}
          style={scale("fanSpeed")}
          className="h-12 rounded-[10px] border border-[#b0aca7] bg-[#dedad5] flex items-center justify-center gap-2 cursor-pointer active:bg-[#ccc8c3]"
        >
          <span className="text-xs font-medium uppercase tracking-widest text-[#555]">
            Fan Speed: {fanSpeed}
          </span>
        </button>
      </div>
    </div>
  );
}

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

function PasswordGate({
  user,
  children,
}: {
  user: string;
  children: React.ReactNode;
}) {
  const [checked, setChecked] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const authKey = `remote-authenticated-${user}`;

  useEffect(() => {
    const loggedIn = localStorage.getItem(authKey) === "true";
    setUnlocked(loggedIn);
    setChecked(true);
  }, [authKey]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password === `${user}123`) {
      localStorage.setItem(authKey, "true");
      setUnlocked(true);
      setError("");
    } else {
      setError("Invalid password. Contact Jeffrey at @cheeguang on Telegram.");
    }
  }

  if (!checked) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-[320px] flex flex-col gap-3 p-6 rounded-2xl border border-gray-200 shadow-sm"
        >
          <h1 className="text-xl font-semibold text-gray-700">
            Enter Password
          </h1>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-lg border border-gray-300 px-3 text-gray-700 outline-none focus:border-gray-500"
            placeholder="Password"
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            className="h-12 rounded-lg bg-gray-800 text-white font-medium active:bg-gray-700"
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}

function InvalidUserUI() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-[340px] p-6 rounded-2xl border border-gray-200 shadow-sm text-center">
        <h1 className="text-xl font-semibold text-gray-700 mb-2">
          Invalid User
        </h1>
        <p className="text-sm text-gray-500">
          Please contact Jeffrey at @cheeguang on Telegram.
        </p>
      </div>
    </div>
  );
}

function RemotePageInner() {
  const trigger = useCooldown(500);
  const searchParams = useSearchParams();

  const user = (searchParams.get("user") ?? "").toLowerCase();

  if (!VALID_USERS.validUsers.includes(user)) {
    return <InvalidUserUI />;
  }

  const displayName =
    user.charAt(0).toUpperCase() + user.slice(1).toLowerCase();

  return (
    <PasswordGate user={user}>
      <div className="min-h-screen bg-white flex flex-col items-center justify-start py-8 px-4 gap-5">
        <h1 className="text-2xl font-semibold text-gray-700 tracking-tight">
          {displayName}'s Room
        </h1>

        <AirconRemote trigger={trigger} deviceName={`${user}-aircon`} />
        <FanRemote trigger={trigger} deviceName={`${user}-fan`} />
      </div>
    </PasswordGate>
  );
}

export default function RemotePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center text-gray-400">
          Loading...
        </div>
      }
    >
      <RemotePageInner />
    </Suspense>
  );
}
