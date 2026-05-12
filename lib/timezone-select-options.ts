import fullTimezoneIds from "@/lib/timezone-ids.json";

export type TimezoneSelectOption = { value: string; label: string };

function mergeAllTimezoneIds(): Set<string> {
  const ids = new Set<string>(fullTimezoneIds as string[]);
  try {
    for (const tz of Intl.supportedValuesOf("timeZone")) {
      ids.add(tz);
    }
  } catch {
    /* use snapshot only */
  }
  return ids;
}

/** All known IANA zone ids (JSON snapshot ∪ runtime). */
export const TIMEZONE_OPTION_IDS = mergeAllTimezoneIds();

function longOffsetPart(timeZone: string, at: Date): string {
  const raw =
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
    })
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT";

  return raw === "GMT" ? "GMT+00:00" : raw;
}

/**
 * Parses `GMT+05:30` / `GMT-07:00` / `GMT+00:00` into offset from UTC in minutes
 * (positive = east of Greenwich).
 */
export function longOffsetToUtcOffsetMinutes(longOffset: string): number {
  if (longOffset === "GMT" || longOffset === "GMT+00:00") return 0;
  const match = longOffset.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return Number.POSITIVE_INFINITY;
  const sign = match[1] === "-" ? -1 : 1;
  const hours = parseInt(match[2], 10);
  const minutes = match[3] != null ? parseInt(match[3], 10) : 0;
  return sign * (hours * 60 + minutes);
}

export function formatTimezoneSelectLabel(timeZone: string, at: Date): string {
  const gmt = longOffsetPart(timeZone, at);
  return `${gmt} · ${timeZone}`;
}

/**
 * Full timezone list for a combobox: sorted by current GMT offset (west → east),
 * then by IANA id. Labels show `GMT±HH:MM · Zone/Id`.
 */
export function buildTimezoneSelectOptionsByGmt(
  referenceDate: Date = new Date(),
): TimezoneSelectOption[] {
  const rows = [...TIMEZONE_OPTION_IDS].map((timeZone) => {
    const gmt = longOffsetPart(timeZone, referenceDate);
    const offsetMinutes = longOffsetToUtcOffsetMinutes(gmt);
    return {
      value: timeZone,
      label: `${gmt} · ${timeZone}`,
      offsetMinutes,
    };
  });

  rows.sort((a, b) => {
    if (a.offsetMinutes !== b.offsetMinutes) {
      return a.offsetMinutes - b.offsetMinutes;
    }
    return a.value.localeCompare(b.value);
  });

  return rows.map(({ value, label }) => ({ value, label }));
}
