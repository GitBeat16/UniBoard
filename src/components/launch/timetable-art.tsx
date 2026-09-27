/**
 * The printed timetable the film starts from, and the clean week UniBoard
 * turns it into. Both share one grid (6 days × 6 slots) so the change reads
 * as the same information straightening out.
 */
import { interp, easeOutBack } from "@/lib/launch/film";
import { CORAL } from "./kit";

export const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
export const SLOTS = ["8:00", "9:00", "10:15", "11:15", "1:15", "2:15"] as const;

type Cell = { code: string; kind: string; tone: string } | null;

const M = {
  dbms: { code: "DBMS", tone: "var(--color-sky)" },
  toc: { code: "TOC", tone: "var(--color-iris)" },
  spos: { code: "SPOS", tone: "var(--color-leaf)" },
  cnl: { code: "CN LAB", tone: "var(--color-coral)" },
  ml: { code: "ML", tone: "var(--color-sun)" },
  hss: { code: "HSS", tone: "var(--color-sky)" },
};

const c = (m: { code: string; tone: string }, kind: string): Cell => ({ ...m, kind });

/** [day][slot] */
export const GRID: Cell[][] = [
  [c(M.dbms, "TH"), c(M.toc, "TH"), null, c(M.cnl, "PR"), c(M.cnl, "PR"), c(M.hss, "TH")],
  [c(M.spos, "TH"), c(M.dbms, "TH"), c(M.ml, "TH"), null, c(M.spos, "PR"), c(M.spos, "PR")],
  [c(M.toc, "TH"), null, c(M.dbms, "PR"), c(M.dbms, "PR"), c(M.ml, "TH"), null],
  [c(M.ml, "TH"), c(M.spos, "TH"), c(M.toc, "TUT"), null, c(M.cnl, "PR"), c(M.cnl, "PR")],
  [c(M.dbms, "TH"), c(M.hss, "TH"), null, c(M.ml, "PR"), c(M.ml, "PR"), c(M.toc, "TH")],
  [c(M.spos, "TUT"), c(M.ml, "TH"), c(M.dbms, "TUT"), null, null, null],
];

export const CELL_COUNT = GRID.flat().filter(Boolean).length;

/**
 * A photographed printout: off-white paper, serif type, ruled cells, a crease
 * and a bit of glare. `detected` (0–1) outlines the cells the scan has found.
 */
export function PrintedTimetable({
  width = 980,
  detectedRow = -1,
  frame = 0,
}: {
  width?: number;
  /** Cells above this y (0–1 of the grid) are outlined as found. */
  detectedRow?: number;
  frame?: number;
}) {
  const h = width * 0.62;
  return (
    <div
      style={{
        width,
        height: h,
        background: "linear-gradient(160deg, #f7f3ea 0%, #ece6d8 55%, #e2dccd 100%)",
        fontFamily: "'Times New Roman', Times, serif",
        color: "#1d1d1d",
        padding: `${width * 0.03}px ${width * 0.035}px`,
        position: "relative",
        boxShadow: "0 40px 80px rgba(0,0,0,0.55), 0 2px 0 rgba(255,255,255,0.4) inset",
        overflow: "hidden",
      }}
    >
      <div style={{ textAlign: "center", fontSize: width * 0.019, fontWeight: 700, letterSpacing: "0.04em" }}>
        DEPARTMENT OF COMPUTER ENGINEERING
      </div>
      <div style={{ textAlign: "center", fontSize: width * 0.015, marginTop: 2 }}>
        S.E. COMPUTER — DIV 3 · TIME TABLE (TERM I) · W.E.F. 21/07
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${width * 0.08}px repeat(6, 1fr)`,
          marginTop: width * 0.018,
          border: "1.5px solid #222",
          fontSize: width * 0.0155,
        }}
      >
        <div style={{ borderRight: "1px solid #333", borderBottom: "1px solid #333" }} />
        {DAYS.map((d) => (
          <div
            key={d}
            style={{ borderRight: "1px solid #333", borderBottom: "1px solid #333", textAlign: "center", fontWeight: 700, padding: "3px 0" }}
          >
            {d}
          </div>
        ))}
        {SLOTS.map((slot, si) => (
          <Row key={slot} slot={slot} si={si} width={width} detectedRow={detectedRow} frame={frame} />
        ))}
      </div>
      <div style={{ fontSize: width * 0.012, marginTop: 6, display: "flex", justifyContent: "space-between" }}>
        <span>E1–E4: batches for practicals · Room nos. on notice board</span>
        <span>Sd/- HOD</span>
      </div>
      {/* crease, glare and a little lens blur at the corner */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(95deg, transparent 47%, rgba(0,0,0,0.08) 49.5%, rgba(255,255,255,0.35) 50.5%, transparent 53%), radial-gradient(40% 50% at 78% 18%, rgba(255,255,255,0.55), transparent 70%), radial-gradient(60% 60% at 0% 100%, rgba(60,40,10,0.18), transparent 70%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function Row({
  slot,
  si,
  width,
  detectedRow,
  frame,
}: {
  slot: string;
  si: number;
  width: number;
  detectedRow: number;
  frame: number;
}) {
  return (
    <>
      <div style={{ borderRight: "1px solid #333", borderBottom: "1px solid #333", padding: "6px 4px", fontWeight: 700 }}>{slot}</div>
      {DAYS.map((_, di) => {
        const cell = GRID[di][si];
        const found = cell && detectedRow >= (si + 0.5) / SLOTS.length;
        return (
          <div
            key={di}
            style={{
              borderRight: "1px solid #333",
              borderBottom: "1px solid #333",
              padding: `${width * 0.009}px 4px`,
              textAlign: "center",
              lineHeight: 1.15,
              position: "relative",
            }}
          >
            {cell ? (
              <>
                <div style={{ fontWeight: 700 }}>{cell.code}</div>
                <div style={{ fontSize: "0.8em" }}>
                  {cell.kind === "PR" ? "E1–E4" : cell.kind === "TUT" ? "(TUT) E3" : "(TH)"}
                </div>
              </>
            ) : (
              <div style={{ opacity: 0.35 }}>—</div>
            )}
            {found && (
              <div
                style={{
                  position: "absolute",
                  inset: 3,
                  border: `2px solid ${CORAL}`,
                  borderRadius: 4,
                  background: "rgba(242,132,107,0.12)",
                  opacity: 0.6 + 0.4 * Math.sin(frame / 3 + di + si),
                }}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

/**
 * The same week, as UniBoard shows it: a clean card per class, in the
 * module's colour. `frame` counts from when it starts appearing.
 */
export function CleanWeek({ width = 980, frame }: { width?: number; frame: number }) {
  const h = width * 0.62;
  const colW = (width - 40 - 5 * 12) / 6;
  return (
    <div
      style={{
        width,
        height: h,
        background: "#ffffff",
        borderRadius: 28,
        padding: 20,
        boxShadow: "0 30px 70px rgba(17,17,17,0.14), 0 0 0 1px rgba(17,17,17,0.05)",
        position: "relative",
        fontFamily: "var(--font-poppins), sans-serif",
      }}
    >
      <div style={{ display: "flex", gap: 12 }}>
        {DAYS.map((d, di) => (
          <div key={d} style={{ width: colW }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", color: "#5f666d", padding: "4px 6px 10px" }}>{d}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {GRID[di].map((cell, si) => {
                const order = di * 2 + si;
                const t = interp(frame, order * 1.2, order * 1.2 + 14, 0, 1, easeOutBack);
                const o = interp(frame, order * 1.2, order * 1.2 + 6, 0, 1);
                if (!cell) return <div key={si} style={{ height: (h - 100) / 6 - 8 }} />;
                return (
                  <div
                    key={si}
                    style={{
                      height: (h - 100) / 6 - 8,
                      borderRadius: 12,
                      background: `color-mix(in srgb, ${cell.tone} 22%, white)`,
                      borderLeft: `5px solid ${cell.tone}`,
                      padding: "6px 10px",
                      opacity: o,
                      transform: `scale(${0.7 + 0.3 * t})`,
                      transformOrigin: "left center",
                    }}
                  >
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#111", lineHeight: 1.1 }}>{cell.code}</div>
                    <div style={{ fontSize: 12, color: "#3d4247", marginTop: 2 }}>
                      {SLOTS[si]} · {cell.kind === "PR" ? "Lab · E3" : cell.kind === "TUT" ? "Tutorial" : "Lecture"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

