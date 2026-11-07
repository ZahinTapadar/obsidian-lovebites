import React from "react";
import { AbsoluteFill, Easing, Img, OffthreadVideo, Sequence, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Fraunces";

const { fontFamily: fraunces } = loadFont("normal", { weights: ["300", "400", "500", "600"] });
const { fontFamily: frauncesItalic } = loadFont("italic", { weights: ["300", "400", "500"] });

const PINK = "#ff5a6f";
const INK = "#3a2d31";
const PAPER = "#faf6f3";

// scene lengths in frames (30 fps)
const S = { intro: 105, write: 210, read: 135, stats: 135, shelf: 120, outro: 105 };
export const PROMO_FRAMES = Object.values(S).reduce((a, b) => a + b, 0);

const ease = Easing.bezier(0.2, 0.8, 0.2, 1);

/** Paper with a slow pink aurora, shared by every scene. */
const Paper: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
	const f = useCurrentFrame();
	const x = 30 + Math.sin(f / 70) * 8, y = 30 + Math.cos(f / 90) * 6;
	return (
		<AbsoluteFill
			style={{
				background: `radial-gradient(40% 50% at ${x}% ${y}%, rgba(255,90,111,.18), transparent 70%),
					radial-gradient(35% 45% at ${100 - x}% ${y + 20}%, rgba(199,90,168,.12), transparent 70%), ${PAPER}`,
			}}
		>
			{children}
		</AbsoluteFill>
	);
};

/** Hearts and petals drifting upward. */
const Petals: React.FC<{ count?: number; seed?: string }> = ({ count = 26, seed = "p" }) => {
	const f = useCurrentFrame();
	const glyphs = ["❤", "✿", "•", "✦", "❀"];
	return (
		<AbsoluteFill style={{ pointerEvents: "none" }}>
			{Array.from({ length: count }, (_, i) => {
				const r = (k: string) => random(`${seed}-${i}-${k}`);
				const speed = 0.6 + r("s") * 1.4;
				const y = 1150 - ((f * speed * 3 + r("y") * 1300) % 1300);
				const x = r("x") * 1920 + Math.sin((f + r("p") * 200) / 40) * 30;
				return (
					<div key={i} style={{ position: "absolute", left: x, top: y, fontSize: 10 + r("z") * 22, color: `hsl(${340 + r("h") * 30} 100% 70%)`, opacity: 0.35 + r("o") * 0.5, transform: `rotate(${f * (r("r") - 0.5) * 4}deg)`, textShadow: "0 0 10px currentColor" }}>
						{glyphs[Math.floor(r("g") * glyphs.length)]}
					</div>
				);
			})}
		</AbsoluteFill>
	);
};

const Title: React.FC<{ size?: number; sub?: string }> = ({ size = 220, sub }) => {
	const f = useCurrentFrame();
	const { fps } = useVideoConfig();
	const rise = spring({ frame: f, fps, config: { damping: 18, mass: 0.9 } });
	const wght = interpolate(f, [0, 40, 80], [200, 520, 420], { extrapolateRight: "clamp", easing: ease });
	return (
		<AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
			<div style={{ fontFamily: fraunces, fontSize: 22, letterSpacing: "0.6em", color: PINK, opacity: rise }}>— ❦ —</div>
			<div
				style={{
					fontFamily: frauncesItalic, fontStyle: "italic", fontSize: size, color: INK, lineHeight: 1,
					fontVariationSettings: `"SOFT" 100, "WONK" 1, "opsz" 144, "wght" ${wght}`,
					transform: `translateY(${(1 - rise) * 40}px)`, opacity: rise, filter: `blur(${(1 - rise) * 8}px)`,
				}}
			>
				LoveBites
			</div>
			{sub && (
				<div style={{ fontFamily: frauncesItalic, fontStyle: "italic", fontSize: 44, color: "#6f5c62", marginTop: 26, opacity: interpolate(f, [25, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
					{sub}
				</div>
			)}
		</AbsoluteFill>
	);
};

/** A captured screen in a floating window, with a caption. */
const Feature: React.FC<{ kicker: string; line: string; src: string; video?: boolean; length: number; flip?: boolean }> = ({ kicker, line, src, video, length, flip }) => {
	const f = useCurrentFrame();
	const { fps } = useVideoConfig();
	const enter = spring({ frame: f, fps, config: { damping: 20 } });
	const out = interpolate(f, [length - 12, length], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
	const zoom = interpolate(f, [0, length], [1, 1.05]);
	const text = (
		<div style={{ width: 520, opacity: enter * out, transform: `translateY(${(1 - enter) * 30}px)` }}>
			<div style={{ fontFamily: fraunces, fontSize: 20, letterSpacing: "0.3em", textTransform: "uppercase", color: PINK }}>{kicker}</div>
			<div style={{ fontFamily: frauncesItalic, fontStyle: "italic", fontSize: 62, lineHeight: 1.1, color: INK, marginTop: 14, fontVariationSettings: `"SOFT" 100, "opsz" 96, "wght" 380` }}>{line}</div>
		</div>
	);
	const shot = (
		<div style={{ width: 1120, height: 875, borderRadius: 18, overflow: "hidden", boxShadow: "0 50px 120px -40px rgba(80,30,40,.55), 0 10px 30px -10px rgba(80,30,40,.35)", opacity: enter * out, transform: `translateY(${(1 - enter) * 60}px) scale(${0.96 + enter * 0.04})` }}>
			<div style={{ width: "100%", height: "100%", transform: `scale(${zoom})`, transformOrigin: "50% 30%" }}>
				{video ? <OffthreadVideo src={staticFile(src)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />}
			</div>
		</div>
	);
	return (
		<Paper>
			<AbsoluteFill style={{ flexDirection: flip ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", gap: 90 }}>
				{text}
				{shot}
			</AbsoluteFill>
		</Paper>
	);
};

export const Promo: React.FC = () => {
	let at = 0;
	const next = (n: number) => { const from = at; at += n; return from; };
	return (
		<AbsoluteFill style={{ background: PAPER }}>
			<Sequence from={next(S.intro)} durationInFrames={S.intro}>
				<Paper><Petals /><Title sub="A writing pad that rewards every word." /></Paper>
			</Sequence>
			<Sequence from={next(S.write)} durationInFrames={S.write}>
				<Feature kicker="Write" line="A gliding caret, petals as you type, and a bloom every hundred words." src="writing.mp4" video length={S.write} />
			</Sequence>
			<Sequence from={next(S.read)} durationInFrames={S.read}>
				<Feature kicker="Read" line="One click, and your notes become a book." src="reading.png" length={S.read} flip />
			</Sequence>
			<Sequence from={next(S.stats)} durationInFrames={S.stats}>
				<Feature kicker="Keep count" line="Streaks, pace, and a heatmap of every day you wrote." src="stats.png" length={S.stats} />
			</Sequence>
			<Sequence from={next(S.shelf)} durationInFrames={S.shelf}>
				<Feature kicker="Shelve" line="Every book you read, as a cover on your shelf." src="shelf.png" length={S.shelf} flip />
			</Sequence>
			<Sequence from={next(S.outro)} durationInFrames={S.outro}>
				<Paper>
					<Petals seed="o" count={34} />
					<Title size={170} sub="Community plugins → search “LoveBites”" />
				</Paper>
			</Sequence>
		</AbsoluteFill>
	);
};
