// Minimal, dependency-free .xlsx reader/writer (browser).
// Reads text/number cells from every sheet; writes simple sheets with a
// bold header row. Enough for import templates and uploads.

export type SheetRows = Record<string, string[][]>;

// ---------- reading ----------

function u16(b: Uint8Array, o: number) {
  return b[o] | (b[o + 1] << 8);
}
function u32(b: Uint8Array, o: number) {
  return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzip(buf: Uint8Array): Promise<Map<string, Uint8Array>> {
  // Find end-of-central-directory record.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) {
    if (u32(buf, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("This isn't a valid .xlsx file.");
  const count = u16(buf, eocd + 10);
  let p = u32(buf, eocd + 16);
  const files = new Map<string, Uint8Array>();
  const dec = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (u32(buf, p) !== 0x02014b50) break;
    const method = u16(buf, p + 10);
    const compSize = u32(buf, p + 20);
    const nameLen = u16(buf, p + 28);
    const extraLen = u16(buf, p + 30);
    const commentLen = u16(buf, p + 32);
    const localOffset = u32(buf, p + 42);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;

    const lNameLen = u16(buf, localOffset + 26);
    const lExtraLen = u16(buf, localOffset + 28);
    const start = localOffset + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(start, start + compSize);
    if (method === 0) files.set(name, raw);
    else if (method === 8) files.set(name, await inflateRaw(raw));
  }
  return files;
}

function xmlText(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

function colIndex(ref: string): number {
  const letters = ref.replace(/[^A-Z]/gi, "").toUpperCase();
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function textOf(inner: string): string {
  // Concatenate all <t> runs (handles rich text).
  const parts = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]);
  return xmlText(parts.join(""));
}

// Excel stores dates as serial numbers; a cell is a date when its style's
// number format is a date format. We detect that and emit ISO dates.
function parseStyles(xml: string): Set<number> {
  const dateFmtIds = new Set<number>();
  for (const m of xml.matchAll(/<numFmt\s+[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"/g)) {
    const code = m[2].toLowerCase().replace(/\[[^\]]*\]|"[^"]*"/g, "");
    if (/[dmyh]/.test(code) && !/^0|#/.test(code)) dateFmtIds.add(Number(m[1]));
  }
  const builtin = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);
  const cellXfs = xml.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1] ?? "";
  const dateStyles = new Set<number>();
  [...cellXfs.matchAll(/<xf\s[^>]*?numFmtId="(\d+)"/g)].forEach((m, i) => {
    const id = Number(m[1]);
    if (builtin.has(id) || dateFmtIds.has(id)) dateStyles.add(i);
  });
  return dateStyles;
}

function serialToIso(serial: number): string {
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  return new Date(ms).toISOString().slice(0, 10);
}

export async function readXlsx(file: File | ArrayBuffer): Promise<SheetRows> {
  const buffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const files = await unzip(new Uint8Array(buffer));
  const dec = new TextDecoder();
  const read = (name: string) => {
    const f = files.get(name);
    return f ? dec.decode(f) : "";
  };

  const shared = [...read("xl/sharedStrings.xml").matchAll(/<si[^>]*>([\s\S]*?)<\/si>/g)].map(
    (m) => textOf(m[1])
  );
  const dateStyles = parseStyles(read("xl/styles.xml"));

  const wb = read("xl/workbook.xml");
  const rels = read("xl/_rels/workbook.xml.rels");
  const relTarget = new Map<string, string>();
  for (const m of rels.matchAll(/<Relationship\s[^>]*>/g)) {
    const id = m[0].match(/Id="([^"]+)"/)?.[1];
    const target = m[0].match(/Target="([^"]+)"/)?.[1];
    if (id && target) relTarget.set(id, target.replace(/^\/?(xl\/)?/, "xl/"));
  }

  const result: SheetRows = {};
  for (const m of wb.matchAll(/<sheet\s[^>]*>/g)) {
    const name = xmlText(m[0].match(/name="([^"]*)"/)?.[1] ?? "");
    const rid = m[0].match(/r:id="([^"]+)"/)?.[1] ?? "";
    const path = relTarget.get(rid);
    if (!name || !path) continue;
    const xml = read(path);
    const rows: string[][] = [];
    for (const rm of xml.matchAll(/<row\s[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const rowNum = Number(rm[0].match(/\sr="(\d+)"/)?.[1] ?? rows.length + 1);
      const cells: string[] = [];
      for (const cm of (rm[1] ?? "").matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = cm[1];
        const inner = cm[2] ?? "";
        const ref = attrs.match(/\sr="([A-Z]+\d+)"|^r="([A-Z]+\d+)"/);
        const idx = colIndex(ref?.[1] ?? ref?.[2] ?? "A1");
        const type = attrs.match(/\bt="([^"]+)"/)?.[1];
        const style = Number(attrs.match(/\bs="(\d+)"/)?.[1] ?? -1);
        let value = "";
        if (type === "s") {
          value = shared[Number(inner.match(/<v>([\s\S]*?)<\/v>/)?.[1])] ?? "";
        } else if (type === "inlineStr") {
          value = textOf(inner);
        } else {
          const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";
          value = xmlText(v);
          if (type !== "str" && type !== "b" && type !== "e" && v !== "" && dateStyles.has(style)) {
            const n = Number(v);
            if (Number.isFinite(n)) value = serialToIso(n);
          }
        }
        cells[idx] = value;
      }
      while (rows.length < rowNum - 1) rows.push([]);
      rows[rowNum - 1] = Array.from(cells, (c) => c ?? "");
    }
    result[name] = rows;
  }
  return result;
}

// ---------- writing ----------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zipStore(entries: { name: string; data: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const push = (arr: number[]) => Uint8Array.from(arr);
  const le16 = (n: number) => [n & 255, (n >> 8) & 255];
  const le32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];

  for (const e of entries) {
    const name = enc.encode(e.name);
    const crc = crc32(e.data);
    const local = push([
      ...le32(0x04034b50), ...le16(20), ...le16(0x0800), ...le16(0), ...le16(0), ...le16(0x21),
      ...le32(crc), ...le32(e.data.length), ...le32(e.data.length), ...le16(name.length), ...le16(0),
    ]);
    chunks.push(local, name, e.data);
    central.push(
      push([
        ...le32(0x02014b50), ...le16(20), ...le16(20), ...le16(0x0800), ...le16(0), ...le16(0), ...le16(0x21),
        ...le32(crc), ...le32(e.data.length), ...le32(e.data.length), ...le16(name.length),
        ...le16(0), ...le16(0), ...le16(0), ...le16(0), ...le32(0), ...le32(offset),
      ]),
      name
    );
    offset += local.length + name.length + e.data.length;
  }
  const centralSize = central.reduce((n, c) => n + c.length, 0);
  const end = push([
    ...le32(0x06054b50), ...le16(0), ...le16(0), ...le16(entries.length), ...le16(entries.length),
    ...le32(centralSize), ...le32(offset), ...le16(0),
  ]);
  const all = [...chunks, ...central, end];
  const out = new Uint8Array(all.reduce((n, c) => n + c.length, 0));
  let p = 0;
  for (const c of all) {
    out.set(c, p);
    p += c.length;
  }
  return out;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function colName(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

export function buildXlsx(sheets: { name: string; rows: string[][] }[]): Blob {
  const enc = new TextEncoder();
  const entries: { name: string; data: Uint8Array }[] = [];
  const add = (name: string, xml: string) =>
    entries.push({ name, data: enc.encode(xml) });
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

  add(
    "[Content_Types].xml",
    `${head}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets
      .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
      .join("")}</Types>`
  );
  add(
    "_rels/.rels",
    `${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
  );
  add(
    "xl/workbook.xml",
    `${head}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
      .map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join("")}</sheets></workbook>`
  );
  add(
    "xl/_rels/workbook.xml.rels",
    `${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
      .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
      .join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
  );
  add(
    "xl/styles.xml",
    `${head}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`
  );
  sheets.forEach((s, si) => {
    const widths = s.rows[0]?.map((h, i) => {
      const longest = Math.max(h.length, ...s.rows.slice(1, 6).map((r) => (r[i] ?? "").length));
      return `<col min="${i + 1}" max="${i + 1}" width="${Math.min(Math.max(longest + 4, 12), 40)}" customWidth="1"/>`;
    });
    const rows = s.rows
      .map(
        (r, ri) =>
          `<row r="${ri + 1}">${r
            .map(
              (v, ci) =>
                `<c r="${colName(ci)}${ri + 1}" t="inlineStr" s="${ri === 0 ? 1 : 2}"><is><t xml:space="preserve">${esc(v)}</t></is></c>`
            )
            .join("")}</row>`
      )
      .join("");
    add(
      `xl/worksheets/sheet${si + 1}.xml`,
      `${head}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${
        widths ? `<cols>${widths.join("")}</cols>` : ""
      }<sheetData>${rows}</sheetData></worksheet>`
    );
  });

  return new Blob([zipStore(entries) as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
