import { getPalette } from "@/lib/vana-sources";

interface SoulCardData {
  [key: string]: unknown;
}

export function DataSoulCard({ data }: { data: SoulCardData }) {
  const d = data as Record<string, unknown>;
  const palette = (d.dominant_colors as string[]) || getPalette((d.mood as string) || "default");
  const scores = (d.personality_scores as Record<string, number>) || {};

  const barColor = palette[0] || "#8b5cf6";
  const barColor2 = palette[1] || "#ec4899";

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Main Card */}
      <div
        className="rounded-2xl border p-6 space-y-5"
        style={{
          background: `linear-gradient(135deg, ${palette[0]}15, ${palette[1] || palette[0]}08)`,
          borderColor: palette[0] + "40",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold" style={{ color: palette[0] }}>
              NODEA
            </h3>
            <p className="text-sm mt-1">{String(d.soul_tagline || "Loading...")}</p>
          </div>
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-semibold"
            style={{
              background: `linear-gradient(135deg, ${palette[0]}, ${palette[1] || palette[0]})`,
            }}
          >
            {String(d.mood || "V").charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Core Identity */}
        {d.core_identity && (
          <p className="text-sm text-white/80 leading-relaxed border-l-2 pl-3" style={{ borderColor: palette[0] }}>
            {String(d.core_identity)}
          </p>
        )}

        {/* Personality Scores */}
        <div className="space-y-3">
          <div className="text-xs text-white/40 uppercase tracking-wider">Personality Profile</div>
          
          {Object.entries({
            "Creative ↔ Analytical": scores.creative_analytical,
            "Social ↔ Solitary": scores.social_solitary,
            "Consumer ↔ Creator": scores.consumer_creator,
            "Risk-Taker ↔ Cautious": scores.risk_taker_caution,
            "Optimistic ↔ Realistic": scores.optimistic_realistic,
          }).map(([label, value], i) => {
            const pct = (value as number) || 50;
            const color = i % 2 === 0 ? barColor : barColor2;
            return (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/50">{label}</span>
                  <span className="text-white/70">{pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}aa)` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Hidden Patterns */}
        {(d.hidden_patterns as string[])?.length > 0 && (
          <div>
            <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Hidden Patterns</div>
            <div className="space-y-1.5">
              {(d.hidden_patterns as string[]).map((p, i) => (
                <div key={i} className="text-xs text-white/70 flex items-start gap-2">
                  <span style={{ color: palette[i % palette.length] }}>•</span>
                  {p}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fun Facts */}
        {(d.fun_facts as string[])?.length > 0 && (
          <div>
            <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Fun Facts</div>
            <div className="space-y-1.5">
              {(d.fun_facts as string[]).map((f, i) => (
                <div key={i} className="text-xs text-white/60 flex items-start gap-2">
                  <span style={{ color: palette[(i + 1) % palette.length] }}>✦</span>
                  {f}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aesthetic + Mood */}
        <div className="flex items-center gap-4 pt-2 border-t border-white/10">
          <div>
            <div className="text-[10px] text-white/30 uppercase">Aesthetic</div>
            <div className="text-sm font-medium">{String(d.aesthetic || "—")}</div>
          </div>
          <div className="flex gap-1.5">
            {palette.map((c, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-full border border-white/20"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-4">
        <button className="flex-1 py-2.5 bg-violet-600/20 border border-violet-500/30 hover:bg-violet-600/30 rounded-lg text-sm font-medium transition-colors">
          <span className="inline-flex items-center justify-center gap-2">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
              <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
              <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
            </svg>
            Export PNG
          </span>
        </button>
        <button className="flex-1 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors">
          <span className="inline-flex items-center justify-center gap-2">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Share to X
          </span>
        </button>
      </div>
    </div>
  );
}
