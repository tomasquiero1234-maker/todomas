// Métricas (solo para quien recibe pedidos): volumen, tiempos de respuesta e historial
import { html, useState, useMemo, useRef, useEffect } from '../deps.js';
import { useApp } from '../ctx.js';
import {
  cls, isRequest, hoursBetween, median, fmtNum, tsToLocalDate, todayISO, addDays, weekStart, fmtDate, diffDays, dueState,
} from '../util.js';
import { Segmented, Stat, Avatar, Icon, Empty } from './ui.js';
import { taskRows, exportXlsx } from '../export.js';

const PERIODS = { 30: 30, 90: 90, 365: 365, all: null };

export function fmtDur(h, t, lang) {
  if (h == null) return '—';
  if (h < 1) return t('dur.lt1h');
  if (h < 24) return t('dur.hours', { n: fmtNum(h, lang, h < 10 ? 1 : 0) });
  const d = Math.round((h / 24) * 10) / 10;
  return t('dur.days', { n: fmtNum(d, lang, 1) });
}

function niceStep(max) {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const n = raw / mag;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
  return Math.max(1, step);
}

// Columnas apiladas (2 series): marcas finas, extremo redondeado, 2px de aire entre segmentos
function ColumnChart({ data, series, label }) {
  const { t } = useApp();
  const [hover, setHover] = useState(null);
  const [table, setTable] = useState(false);
  const wrap = useRef();
  const [W, setW] = useState(680);
  useEffect(() => {
    if (!wrap.current) return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [table]);
  const H = 240, L = 34, R = 8, TOP = 14, B = 30;
  const totals = data.map((d) => d.values.reduce((a, b) => a + b, 0));
  const step = niceStep(Math.max(1, ...totals));
  const max = Math.max(step, Math.ceil(Math.max(1, ...totals) / step) * step);
  const ticks = [];
  for (let v = 0; v <= max; v += step) ticks.push(v);
  const band = (W - L - R) / data.length;
  const bw = Math.min(24, band * 0.62);
  const y = (v) => TOP + (H - TOP - B) * (1 - v / max);
  const every = Math.ceil(data.length / Math.max(3, Math.floor(W / 80)));

  const bar = (x, yt, yb, w, round) => {
    const h = yb - yt;
    if (h <= 0) return '';
    const r = round ? Math.min(4, h, w / 2) : 0;
    return `M${x},${yb}L${x},${yt + r}Q${x},${yt} ${x + r},${yt}L${x + w - r},${yt}Q${x + w},${yt} ${x + w},${yt + r}L${x + w},${yb}Z`;
  };

  return html`<div class="chart">
    <div class="chart-top">
      <div class="legend">${series.map((s) => html`<span class="legend-item" key=${s.name}><i style=${`background:${s.color}`}></i>${s.name}</span>`)}</div>
      <button class="btn ghost xs" onClick=${() => setTable(!table)}><${Icon} name=${table ? 'chart' : 'table'} size=${13} />${table ? t('chart.showChart') : t('chart.showTable')}</button>
    </div>
    ${table
      ? html`<table class="data-table compact"><thead><tr><th>${label}</th>${series.map((s) => html`<th class="num">${s.name}</th>`)}<th class="num">${t('chart.total')}</th></tr></thead>
          <tbody>${data.map((d, i) => html`<tr><td>${d.long || d.label}</td>${d.values.map((v) => html`<td class="num">${v}</td>`)}<td class="num"><b>${totals[i]}</b></td></tr>`)}</tbody></table>`
      : html`<div class="chart-wrap" ref=${wrap}>
        <svg viewBox=${`0 0 ${W} ${H}`} width=${W} height=${H} class="chart-svg" role="img" aria-label=${label}>
          ${ticks.map((v) => html`<g key=${v}>
            <line x1=${L} x2=${W - R} y1=${y(v)} y2=${y(v)} class=${v === 0 ? 'axis' : 'grid'} />
            <text x=${L - 8} y=${y(v)} class="tick" text-anchor="end" dominant-baseline="middle">${v}</text>
          </g>`)}
          ${data.map((d, i) => {
            const x = L + band * i + (band - bw) / 2;
            let acc = 0;
            const segs = d.values.map((v, s) => {
              const yb = y(acc), yt = y(acc + v);
              acc += v;
              return { s, v, yb, yt };
            }).filter((g) => g.v > 0);
            return html`<g key=${d.key} class=${cls('col-g', hover === i && 'hover')} tabindex="0"
              aria-label=${`${d.long || d.label}: ${series.map((s, k) => `${s.name} ${d.values[k]}`).join(', ')}`}
              onMouseEnter=${() => setHover(i)} onMouseLeave=${() => setHover(null)} onFocus=${() => setHover(i)} onBlur=${() => setHover(null)}>
              <rect x=${L + band * i} y=${TOP} width=${band} height=${H - TOP - B} fill="transparent" />
              ${segs.map((g, k) => html`<path key=${g.s} fill=${series[g.s].color}
                d=${bar(x, g.yt, k > 0 ? g.yb - 2 : g.yb, bw, k === segs.length - 1)} />`)}
              ${(i % every === 0 || i === data.length - 1) && html`<text x=${L + band * i + band / 2} y=${H - B + 18} class="tick" text-anchor="middle">${d.label}</text>`}
            </g>`;
          })}
        </svg>
        ${hover !== null && html`<div class="tooltip" style=${`left:${((L + band * hover + band / 2) / W) * 100}%`}>
          <div class="tt-title">${data[hover].long || data[hover].label}</div>
          ${series.map((s, k) => html`<div class="tt-row"><i style=${`background:${s.color}`}></i><b>${data[hover].values[k]}</b><span>${s.name}</span></div>`)}
        </div>`}
      </div>`}
  </div>`;
}

// Barras horizontales (HTML): el valor siempre visible como texto
function BarList({ rows, format = (v) => v, empty }) {
  const max = Math.max(...rows.map((r) => r.value || 0), 0);
  if (!rows.length || max === 0) return html`<p class="hint">${empty}</p>`;
  return html`<div class="barlist">
    ${rows.map((r) => html`<div class="bl-row" key=${r.key} title=${`${r.label}: ${format(r.value)}${r.note ? ' · ' + r.note : ''}`}>
      <div class="bl-label">${r.person && html`<${Avatar} person=${r.person} size=${20} />`}<span>${r.label}</span></div>
      <div class="bl-track"><div class="bl-bar" style=${`width:${r.value ? Math.max(2, (r.value / max) * 100) : 0}%`}></div></div>
      <div class="bl-value">${r.value == null ? '—' : format(r.value)}${r.note && html`<small>${r.note}</small>`}</div>
    </div>`)}
  </div>`;
}

export function MetricsPage() {
  const { t, me, tasks, profiles, byId, lang, openTask, toast } = useApp();
  const [period, setPeriod] = useState('90');
  const [q, setQ] = useState('');
  const T = todayISO();

  const m = useMemo(() => {
    const mine = tasks.filter((x) => x.assignee_id === me.id);
    const doneAll = mine.filter((x) => x.status === 'done' && x.completed_at);
    const earliest = doneAll.reduce((a, x) => (tsToLocalDate(x.completed_at) < a ? tsToLocalDate(x.completed_at) : a), T);
    const from = PERIODS[period] ? addDays(T, -PERIODS[period] + 1) : earliest;
    const inP = (ts) => ts && tsToLocalDate(ts) >= from;
    const received = mine.filter((x) => isRequest(x) && inP(x.created_at));
    const done = doneAll.filter((x) => inP(x.completed_at));
    const doneReq = done.filter(isRequest);
    const resp = doneReq.map((x) => hoursBetween(x.created_at, x.completed_at));
    const withDue = done.filter((x) => x.due_date);
    const onTime = withDue.filter((x) => tsToLocalDate(x.completed_at) <= x.due_date);
    const open = mine.filter((x) => x.status !== 'done');
    const overdue = open.filter((x) => dueState(x) === 'overdue');

    // cubetas semanales (30/90 días) o mensuales (12 meses / todo)
    const monthly = period === '365' || period === 'all';
    const buckets = [];
    if (monthly) {
      let y = Number(from.slice(0, 4)), mo = Number(from.slice(5, 7));
      const endKey = T.slice(0, 7);
      for (;;) {
        const key = `${y}-${String(mo).padStart(2, '0')}`;
        buckets.push({ key, label: fmtDate(`${key}-15`, lang, { month: 'short' }), long: fmtDate(`${key}-15`, lang, { month: 'long', year: 'numeric' }), values: [0, 0] });
        if (key >= endKey || buckets.length > 60) break;
        mo += 1;
        if (mo > 12) { mo = 1; y += 1; }
      }
    } else {
      for (let w = weekStart(from); w <= T; w = addDays(w, 7)) {
        buckets.push({ key: w, label: fmtDate(w, lang, { day: 'numeric', month: 'short' }), long: t('chart.weekOf', { date: fmtDate(w, lang, { day: 'numeric', month: 'long' }) }), values: [0, 0] });
      }
    }
    for (const x of done) {
      const d = tsToLocalDate(x.completed_at);
      const key = monthly ? d.slice(0, 7) : weekStart(d);
      const b = buckets.find((k) => k.key === key);
      if (b) b.values[isRequest(x) ? 0 : 1] += 1;
    }

    const people = profiles.filter((p) => p.id !== me.id && mine.some((x) => x.created_by === p.id));
    const perPerson = people.map((p) => {
      const rec = received.filter((x) => x.created_by === p.id);
      const dn = doneReq.filter((x) => x.created_by === p.id);
      return {
        person: p,
        received: rec.length,
        open: open.filter((x) => x.created_by === p.id).length,
        resp: median(dn.map((x) => hoursBetween(x.created_at, x.completed_at))),
        done: dn.length,
      };
    });

    const days = Math.max(1, diffDays(from, T) + 1);
    return { from, received, done, doneReq, resp, withDue, onTime, open, overdue, buckets, perPerson, days };
  }, [tasks, me.id, period, lang]);

  const history = useMemo(() => {
    const s = q.trim().toLowerCase();
    return m.done
      .filter((x) => !s || [x.title, x.client, byId[x.created_by]?.full_name].some((v) => v && v.toLowerCase().includes(s)))
      .sort((a, b) => b.completed_at.localeCompare(a.completed_at));
  }, [m.done, q]);

  const pct = m.withDue.length ? Math.round((m.onTime.length / m.withDue.length) * 100) : null;
  const perWeek = (m.received.length / m.days) * 7;
  const series = [
    { name: t('metrics.seriesRequests'), color: 'var(--series-1)' },
    { name: t('metrics.seriesOwn'), color: 'var(--series-2)' },
  ];

  async function doExport() {
    try {
      await exportXlsx(taskRows(history, { t, byId, lang }), `TODOmas-historial-${T}.xlsx`, t('metrics.history'));
    } catch {
      toast(t('error.export'), 'error');
    }
  }

  return html`<div class="page">
    <div class="page-head">
      <div>
        <h1>${t('metrics.title')}</h1>
        <p class="sub">${t('metrics.sub')}</p>
      </div>
    </div>
    <div class="filters">
      <${Segmented} small value=${period} onChange=${setPeriod} options=${[
        { value: '30', label: t('period.30') }, { value: '90', label: t('period.90') },
        { value: '365', label: t('period.365') }, { value: 'all', label: t('period.all') },
      ]} />
    </div>

    <div class="stats">
      <${Stat} label=${t('metrics.received')} value=${m.received.length} sub=${t('metrics.perWeek', { n: fmtNum(perWeek, lang, 1) })} />
      <${Stat} label=${t('metrics.completed')} value=${m.done.length} sub=${t('metrics.completedSplit', { req: m.doneReq.length, own: m.done.length - m.doneReq.length })} />
      <${Stat} label=${t('metrics.response')} value=${fmtDur(median(m.resp), t, lang)} sub=${t('metrics.responseSub')} />
      <${Stat} label=${t('metrics.onTime')} value=${pct == null ? '—' : `${pct}%`} sub=${t('metrics.onTimeSub', { a: m.onTime.length, b: m.withDue.length })} />
      <${Stat} label=${t('metrics.openNow')} value=${m.open.length} sub=${m.overdue.length ? t('metrics.overdue', { n: m.overdue.length }) : t('metrics.noOverdue')} tone=${m.overdue.length ? 'critical' : ''} />
    </div>

    <section class="card-panel">
      <div class="panel-title">${t('metrics.completedChart')}</div>
      ${m.done.length
        ? html`<${ColumnChart} data=${m.buckets} series=${series} label=${t('metrics.completedChart')} />`
        : html`<p class="hint">${t('metrics.noData')}</p>`}
    </section>

    <div class="grid-2">
      <section class="card-panel">
        <div class="panel-title">${t('metrics.byBanker')}</div>
        <p class="hint">${t('metrics.byBankerSub')}</p>
        <${BarList} empty=${t('metrics.noData')} rows=${m.perPerson.map((r) => ({
          key: r.person.id, person: r.person, label: r.person.full_name, value: r.received,
          note: r.open ? t('metrics.openShort', { n: r.open }) : '',
        }))} />
      </section>
      <section class="card-panel">
        <div class="panel-title">${t('metrics.respByBanker')}</div>
        <p class="hint">${t('metrics.respByBankerSub')}</p>
        <${BarList} empty=${t('metrics.noData')} format=${(v) => fmtDur(v, t, lang)} rows=${m.perPerson.filter((r) => r.done).map((r) => ({
          key: r.person.id, person: r.person, label: r.person.full_name, value: r.resp,
          note: t('metrics.nDone', { n: r.done }),
        }))} />
      </section>
    </div>

    <section class="card-panel">
      <div class="panel-head">
        <div class="panel-title">${t('metrics.history')} <span class="count-badge">${history.length}</span></div>
        <div class="panel-actions">
          <label class="search"><${Icon} name="search" size=${14} /><input value=${q} onInput=${(e) => setQ(e.target.value)} placeholder=${t('metrics.search')} /></label>
          <button class="btn ghost sm" onClick=${doExport} disabled=${!history.length}><${Icon} name="download" size=${14} />Excel</button>
        </div>
      </div>
      ${history.length
        ? html`<div class="table-scroll"><table class="data-table">
            <thead><tr>
              <th>${t('metrics.colDone')}</th><th>${t('metrics.colTitle')}</th><th>${t('metrics.colFrom')}</th>
              <th>${t('metrics.colClient')}</th><th class="num">${t('metrics.colTime')}</th><th>${t('metrics.colOnTime')}</th>
            </tr></thead>
            <tbody>${history.slice(0, 200).map((x) => {
              const late = x.due_date && tsToLocalDate(x.completed_at) > x.due_date;
              return html`<tr key=${x.id} onClick=${() => openTask(x.id)} class="clickable">
                <td class="nowrap">${fmtDate(tsToLocalDate(x.completed_at), lang, { day: 'numeric', month: 'short' })}</td>
                <td>${x.title}</td>
                <td class="nowrap">${isRequest(x) ? html`<span class="inline-person"><${Avatar} person=${byId[x.created_by]} size=${18} />${byId[x.created_by]?.full_name}</span>` : html`<span class="muted">${t('metrics.own')}</span>`}</td>
                <td>${x.client || ''}</td>
                <td class="num nowrap">${isRequest(x) ? fmtDur(hoursBetween(x.created_at, x.completed_at), t, lang) : ''}</td>
                <td>${x.due_date ? (late
                  ? html`<span class="due overdue"><${Icon} name="alert" size=${12} />${t('metrics.late')}</span>`
                  : html`<span class="due done"><${Icon} name="check" size=${12} />${t('metrics.ok')}</span>`) : ''}</td>
              </tr>`;
            })}</tbody>
          </table></div>
          ${history.length > 200 && html`<p class="hint">${t('metrics.moreInExcel', { n: history.length - 200 })}</p>`}`
        : html`<${Empty} icon="inbox" title=${t('metrics.noHistory')} />`}
    </section>
  </div>`;
}
