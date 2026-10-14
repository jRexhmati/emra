// Static site generator for emra.coo.al — no dependencies. Run: node build.mjs  -> ./_site
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, existsSync } from "node:fs";

const SITE = "https://emra.coo.al";
const OUT = "_site";
const YEARS = ["2016","2017","2018","2019","2020","2021","2022","2023","2024","2025"];
const TODAY = new Date().toISOString().slice(0, 10);

// ---- data ----
const raw = JSON.parse(readFileSync("data.json", "utf8"));
const rows = raw.map(r => {
  const y = r.slice(6), s = y.reduce((a, b) => a + b, 0), mx = Math.max(...y);
  return { n: r[0], q: r[1] || r[0].toLowerCase(), g: r[2], f: r[3], m: r[4], t: r[5], y, s,
           p: s ? YEARS[y.indexOf(mx)] : "", len: [...r[0]].length };
}).sort((a, b) => b.s - a.s || b.t - a.t);
rows.forEach((d, i) => d.r = i + 1);
let fr = 0, mr = 0;
rows.forEach(d => { if (d.g[0] === "F") d.gr = ++fr; else d.gr = ++mr; });

// slugs: ascii (ë→e, ç→c); on collision the more popular name keeps the ascii slug
const ascii = n => n.toLowerCase().replace(/ë/g, "e").replace(/ç/g, "c");
const taken = new Map();
[...rows].sort((a, b) => b.t - a.t).forEach(d => {
  let s = ascii(d.n);
  if (taken.has(s)) s = d.n.toLowerCase();
  if (taken.has(s)) s = s + "-" + d.g[0].toLowerCase();
  taken.set(s, d); d.slug = s;
});
const url = d => `/emri/${encodeURIComponent(d.slug)}/`;

// ---- helpers ----
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = n => n.toLocaleString("en-US").replace(/,/g, ".");
const genderWord = g => g[0] === "F" ? (g[1] ? "kryesisht femëror" : "femëror") : (g[1] ? "kryesisht mashkullor" : "mashkullor");
const write = (path, html) => { mkdirSync(OUT + path.replace(/[^/]*$/, ""), { recursive: true }); writeFileSync(OUT + path, html); };

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">`;

function head({ title, desc, path, jsonld, extra = "" }) {
  return `<!doctype html>
<html lang="sq">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${path}">
<meta name="robots" content="index,follow">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Emrat në Shqipëri">
<meta property="og:locale" content="sq_AL">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${path}">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#b3192b">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23b3192b'/%3E%3Ctext x='16' y='22' font-family='Arial' font-weight='700' font-size='16' text-anchor='middle' fill='white'%3EE%3C/text%3E%3C/svg%3E">
${FONTS}
<link rel="stylesheet" href="/assets/site.css">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ""}
${extra}
</head>`;
}

const nav = `<nav class="crumbs"><a href="/">Emrat 2016–2025</a> <a href="/emra-vajzash/">Emra vajzash</a> <a href="/emra-djemsh/">Emra djemsh</a></nav>`;
const footer = `<footer>Burimi: <a href="https://www.instat.gov.al/sq/kerko-emrin/" rel="noopener">INSTAT, Kërko Emrin</a>. Numri i lindjeve të regjistruara çdo vit sipas grafikut të popullaritetit të INSTAT. Viti 2025 mund të jetë i paplotë.</footer>`;

function spark(y, w = 84, h = 22) {
  const mx = Math.max(...y, 1);
  const pts = y.map((v, i) => [2 + i * (w - 4) / 9, h - 2 - (v / mx) * (h - 4)]);
  const line = pts.map(p => p.map(n => n.toFixed(1)).join(",")).join(" ");
  const e = pts[9];
  return `<svg class="sp" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polygon points="2,${h - 2} ${line} ${w - 2},${h - 2}" fill="var(--accent-soft)"/><polyline points="${line}" fill="none" stroke="var(--accent)" stroke-width="1.5"/><circle cx="${e[0].toFixed(1)}" cy="${e[1].toFixed(1)}" r="2" fill="var(--accent)"/></svg>`;
}
const rowHtml = (d, rank) => { const mx = Math.max(...d.y);
  return `<tr><td class="rank">${rank}</td><td class="l name"><a href="${url(d)}">${esc(d.n)}</a></td><td class="l"><span class="g ${d.g[0]}">${d.g[0] === "F" ? "F" : "M"}${d.g[1] ? "*" : ""}</span></td>${d.y.map(v => `<td class="yr${v === mx && v > 0 ? " hi" : ""}">${v ? fmt(v) : "·"}</td>`).join("")}<td class="sum">${fmt(d.s)}</td><td class="l">${spark(d.y)}</td><td>${d.p || "–"}</td><td>${fmt(d.t)}</td></tr>`; };
const thead = `<tr><th>#</th><th class="l">Emri</th><th class="l">Gjinia</th>${YEARS.map(y => `<th>${y}</th>`).join("")}<th>2016–25</th><th class="l">Trendi</th><th>Kulmi</th><th>Gjithsej</th></tr>`;

// ---- shared stylesheet ----
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT + "/assets", { recursive: true });
copyFileSync("site.css", OUT + "/assets/site.css");

// ---- home page: template + prerendered top 300 rows ----
const used = rows.filter(d => d.s > 0);
const topF = used.find(d => d.g[0] === "F"), topM = used.find(d => d.g[0] === "M");
let home = readFileSync("index.html", "utf8");
home = home.replace("<!--ROWS-->", used.slice(0, 300).map((d, i) => rowHtml(d, i + 1)).join(""))
  .replace("<!--STATS-->", `<span><b>${fmt(rows.length)}</b> emra</span><span><b>${fmt(used.length)}</b> të vënë 2016–2025</span><span><b>${fmt(used.reduce((a, d) => a + d.s, 0))}</b> lindje</span><span>Vajza nr. 1 <b>${esc(topF.n)}</b></span><span>Djem nr. 1 <b>${esc(topM.n)}</b></span>`)
  .replace("<!--TOPF-->", esc(topF.n)).replace("<!--TOPM-->", esc(topM.n))
  .replace("<!--ALLNAMES-->", ["A","B","C","Ç","D","E","Ë","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","X","Y","Z"].map(L => {
    const list = rows.filter(d => d.n[0].toUpperCase() === L).sort((a, b) => a.n.localeCompare(b.n, "sq"));
    return list.length ? `<section><h3>${L}</h3><p>${list.map(d => `<a href="${url(d)}">${esc(d.n)}</a>`).join(" ")}</p></section>` : "";
  }).join(""));
write("/index.html", home);
// published data: original rows + url slug as the last element
const slugOf = new Map(rows.map(d => [d.n, d.slug]));
writeFileSync(OUT + "/data.json", JSON.stringify(raw.map(r => [...r, slugOf.get(r[0])])));

// ---- girls / boys list pages ----
for (const [path, sex, word, h1] of [["/emra-vajzash/", "F", "vajzash", "Emrat më të përdorur për vajza"], ["/emra-djemsh/", "M", "djemsh", "Emrat më të përdorur për djem"]]) {
  const list = used.filter(d => d.g[0] === sex).slice(0, 500);
  const top5 = list.slice(0, 5).map(d => d.n).join(", ");
  write(path + "index.html", head({
    title: `${h1} në Shqipëri 2016–2025 | Top 500 emra ${word}`,
    desc: `Top 500 emrat e ${word} të vënë në Shqipëri 2016–2025, me numrin e lindjeve çdo vit nga INSTAT. Më të përdorurit: ${top5}.`,
    path,
    jsonld: { "@context": "https://schema.org", "@type": "ItemList", name: `${h1} 2016–2025`, numberOfItems: list.length,
      itemListElement: list.slice(0, 100).map((d, i) => ({ "@type": "ListItem", position: i + 1, name: d.n, url: SITE + url(d) })) }
  }) + `<body><div class="wrap">${nav}
<header><div class="eyebrow">INSTAT · lindje të regjistruara 2016–2025</div><h1>${h1} në Shqipëri</h1>
<p class="lede">500 emrat e ${word} që u vunë më shpesh nga 2016 deri më 2025, renditur sipas numrit të lindjeve në 10 vjet. Më të përdorurit janë ${esc(top5)}.</p></header>
<div class="tbl"><table><thead>${thead}</thead><tbody>${list.map((d, i) => rowHtml(d, i + 1)).join("")}</tbody></table></div>
${footer}</div></body></html>`);
}

// ---- one page per name ----
const byPrefix = new Map();
rows.forEach(d => { const k = d.n.slice(0, 3).toLowerCase(); (byPrefix.get(k) || byPrefix.set(k, []).get(k)).push(d); });
for (const d of rows) {
  const sexWord = d.g[0] === "F" ? "vajzave" : "djemve";
  const similar = (byPrefix.get(d.n.slice(0, 3).toLowerCase()) || []).filter(x => x !== d).slice(0, 12);
  const sameLen = used.filter(x => x !== d && x.g[0] === d.g[0] && x.len === d.len).slice(0, 12);
  const mx = Math.max(...d.y, 1);
  const W = 640, H = 220, pad = 34, bw = (W - pad * 2) / 10;
  const bars = d.y.map((v, i) => { const h = (v / mx) * (H - 60); const x = pad + i * bw + 6, yy = H - 28 - h;
    return `<rect x="${x.toFixed(1)}" y="${yy.toFixed(1)}" width="${(bw - 12).toFixed(1)}" height="${Math.max(h, v ? 1 : 0).toFixed(1)}" rx="3" fill="var(--accent)"/><text x="${(x + (bw - 12) / 2).toFixed(1)}" y="${(yy - 6).toFixed(1)}" text-anchor="middle" class="bl">${v ? fmt(v) : ""}</text><text x="${(x + (bw - 12) / 2).toFixed(1)}" y="${H - 10}" text-anchor="middle" class="ax">${YEARS[i]}</text>`; }).join("");
  const peakTxt = d.s ? `Viti me më shumë lindje ishte ${d.p}, me ${fmt(Math.max(...d.y))}.` : "Nga 2016 deri më 2025 nuk ka lindje të regjistruara me këtë emër.";
  const desc = `${fmt(d.t)} persona në Shqipëri kanë emrin ${d.n} (${fmt(d.f)} femra, ${fmt(d.m)} meshkuj). ${fmt(d.s)} lindje me këtë emër 2016–2025${d.s ? `, kulmi në ${d.p}` : ""}. Të dhëna nga INSTAT.`;
  write(`/emri/${d.slug}/index.html`, head({
    title: `Emri ${d.n}: sa persona e kanë në Shqipëri, popullariteti 2016–2025`,
    desc, path: url(d),
    jsonld: { "@context": "https://schema.org", "@graph": [
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Emrat 2016–2025", item: SITE + "/" },
        { "@type": "ListItem", position: 2, name: d.g[0] === "F" ? "Emra vajzash" : "Emra djemsh", item: SITE + (d.g[0] === "F" ? "/emra-vajzash/" : "/emra-djemsh/") },
        { "@type": "ListItem", position: 3, name: d.n, item: SITE + url(d) }] },
      { "@type": "FAQPage", mainEntity: [
        { "@type": "Question", name: `Sa persona kanë emrin ${d.n} në Shqipëri?`, acceptedAnswer: { "@type": "Answer", text: `Sipas INSTAT, ${fmt(d.t)} persona kanë emrin ${d.n}: ${fmt(d.f)} femra dhe ${fmt(d.m)} meshkuj.` } },
        { "@type": "Question", name: `Sa fëmijë morën emrin ${d.n} nga 2016 deri më 2025?`, acceptedAnswer: { "@type": "Answer", text: `${fmt(d.s)} lindje u regjistruan me emrin ${d.n} nga 2016 deri më 2025. ${peakTxt}` } }] }] }
  }) + `<body><div class="wrap narrow">${nav}
<header><div class="eyebrow">Emër ${genderWord(d.g)} · ${d.len} shkronja</div><h1>Emri ${esc(d.n)}</h1>
<p class="lede">${fmt(d.t)} persona në Shqipëri kanë emrin ${esc(d.n)}: ${fmt(d.f)} femra dhe ${fmt(d.m)} meshkuj. Nga 2016 deri më 2025 u regjistruan ${fmt(d.s)} lindje me këtë emër. ${peakTxt}</p></header>
<div class="tiles">
<div><span>Gjithsej persona</span><b>${fmt(d.t)}</b></div>
<div><span>Lindje 2016–2025</span><b>${fmt(d.s)}</b></div>
<div><span>Renditja 2016–2025</span><b>#${fmt(d.r)}</b><small>#${fmt(d.gr)} te ${sexWord}</small></div>
<div><span>Viti kulm</span><b>${d.p || "–"}</b></div>
</div>
<figure class="chart"><figcaption>Lindje me emrin ${esc(d.n)} sipas vitit</figcaption><div class="scroll"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Lindje me emrin ${esc(d.n)} 2016–2025">${bars}<line x1="${pad}" x2="${W - pad}" y1="${H - 28}" y2="${H - 28}" stroke="var(--line)"/></svg></div></figure>
<div class="tbl"><table><thead><tr>${YEARS.map(y => `<th>${y}</th>`).join("")}</tr></thead><tbody><tr>${d.y.map(v => `<td>${fmt(v)}</td>`).join("")}</tr></tbody></table></div>
${similar.length ? `<section class="rel"><h2>Emra që fillojnë njësoj</h2><p>${similar.map(x => `<a href="${url(x)}">${esc(x.n)}</a>`).join(" ")}</p></section>` : ""}
${sameLen.length ? `<section class="rel"><h2>Emra të tjerë ${d.g[0] === "F" ? "vajzash" : "djemsh"} me ${d.len} shkronja</h2><p>${sameLen.map(x => `<a href="${url(x)}">${esc(x.n)}</a>`).join(" ")}</p></section>` : ""}
<p class="src"><a href="https://www.instat.gov.al/sq/kerko-emrin/?Name=${encodeURIComponent(d.q)}" rel="noopener">Shih emrin ${esc(d.n)} në INSTAT</a> për shpërndarjen sipas bashkive.</p>
${footer}</div></body></html>`);
}

// ---- sitemap, robots, 404, CNAME ----
const urls = ["/", "/emra-vajzash/", "/emra-djemsh/", ...rows.map(url)];
writeFileSync(OUT + "/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${SITE}${u}</loc><lastmod>${TODAY}</lastmod></url>`).join("\n")}\n</urlset>\n`);
writeFileSync(OUT + "/robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
write("/404.html", head({ title: "Faqja nuk u gjet | Emrat 2016–2025", desc: "Kjo faqe nuk ekziston.", path: "/404.html" }).replace('content="index,follow"', 'content="noindex"') +
  `<body><div class="wrap narrow">${nav}<header><h1>Faqja nuk u gjet</h1><p class="lede">Ky emër ose kjo faqe nuk ekziston. <a href="/">Kërko emrin në listë</a>.</p></header>${footer}</div></body></html>`);
if (existsSync("CNAME")) copyFileSync("CNAME", OUT + "/CNAME");
console.log(`built ${rows.length} name pages, ${urls.length} urls`);
