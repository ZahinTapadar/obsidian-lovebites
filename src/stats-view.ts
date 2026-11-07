import { ItemView, MarkdownView, WorkspaceLeaf, setTooltip } from "obsidian";
import type LoveBitesPlugin from "./main";
import { computeStats, countWords, dayKey, heatLevel, stripFrontmatter } from "./stats";

export const STATS_VIEW = "lovebites-stats";
const READ_WPM = 230;
const fmt = (n: number) => n.toLocaleString();
const shortDate = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

export class StatsView extends ItemView {
	constructor(leaf: WorkspaceLeaf, private plugin: LoveBitesPlugin) {
		super(leaf);
	}

	getViewType(): string { return STATS_VIEW; }
	getDisplayText(): string { return "Writing statistics"; }
	getIcon(): string { return "flower-2"; }

	async onOpen(): Promise<void> {
		this.render(true);
	}

	private countUp(el: HTMLElement, to: number, animate: boolean): void {
		if (!animate || to === 0) { el.setText(fmt(to)); return; }
		const t0 = performance.now(), dur = 900;
		const step = (t: number) => {
			const k = Math.min(1, (t - t0) / dur);
			el.setText(fmt(Math.round(to * (1 - Math.pow(1 - k, 3)))));
			if (k < 1) window.requestAnimationFrame(step);
		};
		window.requestAnimationFrame(step);
	}

	render(entrance: boolean): void {
		const p = this.plugin;
		const history = p.settings.history;
		const s = computeStats(history, p.settings.goal);
		const animate = entrance && !p.isCalm();
		const root = this.contentEl;
		root.empty();
		root.addClass("lb-stats");
		root.toggleClass("is-animated", animate);

		const head = root.createDiv({ cls: "lb-stats-head" });
		head.createDiv({ cls: "lb-eyebrow", text: new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }) });
		head.createDiv({ cls: "lb-stats-title", text: "Writing" });

		// today: one large number inside a ring
		const today = root.createDiv({ cls: "lb-today" });
		const C = 2 * Math.PI * 52, pct = Math.min(1, s.today / Math.max(1, s.goal));
		const svg = today.createSvg("svg", { attr: { viewBox: "0 0 120 120" } });
		svg.createSvg("circle", { cls: "lb-big-bg", attr: { cx: 60, cy: 60, r: 52 } });
		const fg = svg.createSvg("circle", { cls: "lb-big-fg", attr: { cx: 60, cy: 60, r: 52 } });
		fg.setCssProps({ "--dash": `${C}`, "--off": `${animate ? C : C * (1 - pct)}` });
		if (animate) window.requestAnimationFrame(() => window.requestAnimationFrame(() => fg.setCssProps({ "--off": `${C * (1 - pct)}` })));
		const mid = today.createDiv({ cls: "lb-today-mid" });
		const num = mid.createDiv({ cls: "lb-today-num" });
		mid.createDiv({ cls: "lb-today-sub", text: s.today >= s.goal ? "page written ❦" : `of ${fmt(s.goal)} words` });
		this.countUp(num, s.today, animate);
		setTooltip(today, `${fmt(s.today)} words today, ${Math.round(pct * 100)}% of your goal`);

		// tiles
		const tiles = root.createDiv({ cls: "lb-tiles" });
		const tile = (label: string, value: number | null, note?: string) => {
			const t = tiles.createDiv({ cls: "lb-tile" });
			const v = t.createDiv({ cls: "lb-tile-value" });
			t.createDiv({ cls: "lb-tile-label", text: label });
			if (note) setTooltip(t, note);
			if (value === null) v.setText("—");
			else this.countUp(v, value, animate);
		};
		tile("day streak", s.streak, "Days in a row with any writing");
		tile("words, all time", s.total);
		tile("best day", s.best.w, s.best.key ? `Most words in one day: ${s.best.key}` : "No writing yet");
		tile("goal days", s.goalDays, `Days you reached ${fmt(s.goal)} words`);
		tile("min writing today", s.minutes, "Typing time today; pauses over 20 seconds are not counted");
		tile("words / min", s.pace, "Your pace today while actually writing");

		// heatmap: last 16 weeks, one pink hue from faint to full
		const sec1 = root.createDiv({ cls: "lb-section" });
		sec1.createDiv({ cls: "lb-section-title", text: "Last 16 weeks" });
		const grid = sec1.createDiv({ cls: "lb-heat" });
		const start = new Date();
		start.setDate(start.getDate() - start.getDay() - 7 * 15); // the Sunday 15 weeks back
		const now = new Date();
		for (let i = 0; i < 16 * 7; i++) {
			const d = new Date(start);
			d.setDate(start.getDate() + i);
			const w = history[dayKey(d)]?.w ?? 0;
			const lvl = heatLevel(w, s.goal, d > now);
			const c = grid.createDiv({ cls: `lb-cell l${lvl}` });
			c.setCssProps({ "--i": `${i}` });
			if (lvl >= 0) setTooltip(c, `${shortDate(d)} · ${fmt(w)} words`, { placement: "top" });
		}
		const legend = sec1.createDiv({ cls: "lb-heat-legend" });
		legend.createSpan({ text: "less" });
		for (const l of [0, 1, 2, 3, 4]) legend.createDiv({ cls: `lb-cell l${l}` });
		legend.createSpan({ text: "goal" });

		// bars: last 14 days, dashed line at the goal
		const sec2 = root.createDiv({ cls: "lb-section" });
		sec2.createDiv({ cls: "lb-section-title", text: "Last 14 days" });
		const days = Array.from({ length: 14 }, (_, i) => {
			const d = new Date();
			d.setDate(d.getDate() - 13 + i);
			return { d, w: history[dayKey(d)]?.w ?? 0 };
		});
		const top = Math.max(s.goal, ...days.map((x) => x.w));
		const bars = sec2.createDiv({ cls: "lb-bars" });
		const goalLine = bars.createDiv({ cls: "lb-goal-line" });
		goalLine.setCssProps({ "--goal": `${(s.goal / top) * 100}%` });
		goalLine.createSpan({ text: `goal ${fmt(s.goal)}` });
		days.forEach(({ d, w }, i) => {
			const col = bars.createDiv({ cls: "lb-bar-col" });
			const bar = col.createDiv({ cls: "lb-bar" + (w >= s.goal ? " is-goal" : "") });
			bar.setCssProps({ "--h": `${(w / top) * 100}%`, "--i": `${i}` });
			setTooltip(col, `${shortDate(d)} · ${fmt(w)} words`, { placement: "top" });
		});
		const axis = sec2.createDiv({ cls: "lb-bars-axis" });
		axis.createSpan({ text: days[0].d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) });
		axis.createSpan({ text: "today" });

		// this note
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (view?.file) {
			const body = stripFrontmatter(view.data);
			const words = countWords(body);
			const sec3 = root.createDiv({ cls: "lb-section lb-note" });
			sec3.createDiv({ cls: "lb-section-title", text: "This note" });
			sec3.createDiv({ cls: "lb-note-name", text: view.file.basename });
			sec3.createDiv({ cls: "lb-note-meta", text: `${fmt(words)} words  ·  ${Math.max(1, Math.round(words / READ_WPM))} min read  ·  ${fmt(view.data.length)} characters` });
		}
	}
}
