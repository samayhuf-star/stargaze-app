import Svg, { Circle, Defs, G, Line, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

const S = 280;

const Stars = ({ seed }: { seed: number }) => {
  const dots = [];
  let r = seed;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 46; i++) dots.push(<Circle key={i} cx={rnd() * S} cy={rnd() * S} r={0.6 + rnd() * 1.4} fill="#dbe6ff" opacity={0.35 + rnd() * 0.6} />);
  return <>{dots}</>;
};

const Frame = ({ children, seed }: { children: React.ReactNode; seed: number }) => (
  <Svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
    <Defs>
      <RadialGradient id="bg" cx="50%" cy="40%" r="75%">
        <Stop offset="0" stopColor="#1f2f7a" />
        <Stop offset="1" stopColor="#060a1c" />
      </RadialGradient>
      <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
        <Stop offset="0" stopColor="#ffe9a8" stopOpacity="0.9" />
        <Stop offset="1" stopColor="#ffe9a8" stopOpacity="0" />
      </RadialGradient>
    </Defs>
    <Rect x="0" y="0" width={S} height={S} rx="44" fill="url(#bg)" />
    <Stars seed={seed} />
    {children}
  </Svg>
);

/** Orion-like constellation over a horizon. */
export const ArtSky = () => (
  <Frame seed={11}>
    <Path d="M70 110 L110 80 L150 95 L185 70 M110 80 L125 150 L150 95 M125 150 L100 205 M125 150 L160 200" stroke="#7fb2ff" strokeOpacity="0.7" strokeWidth="2" fill="none" />
    {[[70, 110], [110, 80], [150, 95], [185, 70], [125, 150], [100, 205], [160, 200]].map(([x, y], i) => (
      <G key={i}>
        <Circle cx={x} cy={y} r={11} fill="url(#glow)" />
        <Circle cx={x} cy={y} r={i === 4 ? 5 : 3.4} fill="#fff7e0" />
      </G>
    ))}
    <Path d="M0 238 Q70 220 140 236 T280 230 V280 H0 Z" fill="#04060f" />
    <SvgText x="140" y="262" fill="#7fb2ff" fontSize="14" fontWeight="700" textAnchor="middle">N</SvgText>
  </Frame>
);

/** Crosshair on the Moon: Sky Align. */
export const ArtAlign = () => (
  <Frame seed={23}>
    <Circle cx="140" cy="140" r="50" fill="url(#glow)" />
    <Circle cx="140" cy="140" r="30" fill="#f3efe0" />
    <Circle cx="152" cy="132" r="30" fill="#0d1535" />
    <Circle cx="140" cy="140" r="62" stroke="#7fb2ff" strokeWidth="2.5" fill="none" strokeDasharray="6 6" />
    <Line x1="140" y1="52" x2="140" y2="78" stroke="#7fb2ff" strokeWidth="2.5" />
    <Line x1="140" y1="202" x2="140" y2="228" stroke="#7fb2ff" strokeWidth="2.5" />
    <Line x1="52" y1="140" x2="78" y2="140" stroke="#7fb2ff" strokeWidth="2.5" />
    <Line x1="202" y1="140" x2="228" y2="140" stroke="#7fb2ff" strokeWidth="2.5" />
    <SvgText x="140" y="258" fill="#e8efff" fontSize="14" fontWeight="700" textAnchor="middle">Tap once. Stars lock on.</SvgText>
  </Frame>
);

/** Arrow pointing to a far-off planet: Find. */
export const ArtFind = () => (
  <Frame seed={37}>
    <Path d="M120 190 L140 120 L160 190 L140 176 Z" fill="#7fb2ff" transform="rotate(32 140 160)" />
    <G>
      <Circle cx="214" cy="62" r="20" fill="url(#glow)" />
      <Circle cx="214" cy="62" r="9" fill="#ffe3b3" />
    </G>
    <Rect x="60" y="226" width="160" height="28" rx="14" fill="#0c1226" stroke="#7fb2ff" strokeOpacity="0.5" />
    <SvgText x="140" y="245" fill="#e8efff" fontSize="13" fontWeight="700" textAnchor="middle">Jupiter · 48° away</SvgText>
  </Frame>
);

/** Tonight, ISS and meteors. */
export const ArtPlan = () => (
  <Frame seed={53}>
    <Path d="M30 200 Q140 20 250 150" stroke="#9dffb0" strokeWidth="2" strokeDasharray="5 6" fill="none" />
    <Rect x="136" y="64" width="18" height="10" rx="2" fill="#9dffb0" transform="rotate(-14 145 69)" />
    <Rect x="122" y="66" width="12" height="6" fill="#7fb2ff" transform="rotate(-14 128 69)" />
    <Rect x="156" y="62" width="12" height="6" fill="#7fb2ff" transform="rotate(-14 162 65)" />
    {[0, 1, 2].map((i) => (
      <Line key={i} x1={70 + i * 50} y1={150 + i * 12} x2={100 + i * 50} y2={176 + i * 12} stroke="#fff7e0" strokeWidth="2.4" strokeLinecap="round" opacity={0.9 - i * 0.2} />
    ))}
    <SvgText x="140" y="252" fill="#e8efff" fontSize="14" fontWeight="700" textAnchor="middle">ISS passes · Meteor showers</SvgText>
  </Frame>
);

/** Phone held up to the sky with the camera behind the map: AR view. */
export const ArtCamera = () => (
  <Frame seed={71}>
    <Rect x="92" y="46" width="96" height="176" rx="18" fill="#0a1024" stroke="#7fb2ff" strokeWidth="2.5" />
    <Path d="M100 160 Q140 140 180 156 V212 H100 Z" fill="#1c2a45" />
    <Path d="M112 96 L136 82 L160 100 L172 86" stroke="#7fb2ff" strokeOpacity="0.8" strokeWidth="1.8" fill="none" />
    {[[112, 96], [136, 82], [160, 100], [172, 86]].map(([x, y], i) => (
      <Circle key={i} cx={x} cy={y} r={3} fill="#fff7e0" />
    ))}
    <SvgText x="140" y="128" fill="#e8efff" fontSize="10" fontWeight="700" textAnchor="middle">Cassiopeia</SvgText>
    <SvgText x="140" y="254" fill="#e8efff" fontSize="14" fontWeight="700" textAnchor="middle">Live camera + star labels</SvgText>
  </Frame>
);

/** Tonight list: planets with rise times. */
export const ArtTonight = () => (
  <Frame seed={83}>
    {[['Jupiter', '19:42 rise', '#ffe3b3'], ['Saturn', 'up now', '#f3d9a0'], ['Moon', '62% lit', '#f3efe0'], ['Mars', '23:10 rise', '#ffb08a']].map(([n, t, c], i) => (
      <G key={n}>
        <Rect x="44" y={50 + i * 44} width="192" height="34" rx="12" fill="#0c1226" stroke="#7fb2ff" strokeOpacity="0.35" />
        <Circle cx="66" cy={67 + i * 44} r="7" fill={c} />
        <SvgText x="82" y={72 + i * 44} fill="#e8efff" fontSize="13" fontWeight="700">{n}</SvgText>
        <SvgText x="224" y={72 + i * 44} fill="#9fb3dd" fontSize="12" textAnchor="end">{t}</SvgText>
      </G>
    ))}
    <SvgText x="140" y="246" fill="#e8efff" fontSize="14" fontWeight="700" textAnchor="middle">What&apos;s up tonight</SvgText>
  </Frame>
);

/** Meteor shower radiant: Geminids. */
export const ArtMeteors = () => (
  <Frame seed={97}>
    <Circle cx="190" cy="80" r="16" fill="url(#glow)" />
    {[[175, 95, 60, 170], [182, 100, 120, 220], [200, 98, 230, 190], [170, 80, 70, 110], [205, 75, 255, 120]].map(([x1, y1, x2, y2], i) => (
      <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff7e0" strokeWidth={2.6 - i * 0.3} strokeLinecap="round" opacity={0.95 - i * 0.12} />
    ))}
    <SvgText x="140" y="254" fill="#e8efff" fontSize="14" fontWeight="700" textAnchor="middle">Geminids · peak 13–14 Dec</SvgText>
  </Frame>
);

/** Bell with a star: notification reminders. */
export const ArtBell = () => (
  <Frame seed={109}>
    <Circle cx="140" cy="128" r="60" fill="url(#glow)" opacity="0.35" />
    <Path d="M100 160 Q100 96 140 90 Q180 96 180 160 L192 176 H88 Z" fill="#7fb2ff" />
    <Circle cx="140" cy="186" r="10" fill="#7fb2ff" />
    <Path d="M140 112 L145 124 L158 125 L148 133 L151 146 L140 139 L129 146 L132 133 L122 125 L135 124 Z" fill="#fff7e0" />
    <Rect x="54" y="222" width="172" height="32" rx="14" fill="#0c1226" stroke="#7fb2ff" strokeOpacity="0.5" />
    <SvgText x="140" y="243" fill="#e8efff" fontSize="12" fontWeight="700" textAnchor="middle">ISS overhead in 5 min</SvgText>
  </Frame>
);
