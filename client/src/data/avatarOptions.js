function avatarSvg({ bg, accent, shape, face }) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
      <defs>
        <linearGradient id="g" x1="18" y1="12" x2="100" y2="108" gradientUnits="userSpaceOnUse">
          <stop stop-color="${bg[0]}"/>
          <stop offset="1" stop-color="${bg[1]}"/>
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="34" fill="url(#g)"/>
      <circle cx="94" cy="24" r="18" fill="${accent}" opacity=".22"/>
      <circle cx="22" cy="96" r="24" fill="#fff" opacity=".12"/>
      ${shape}
      ${face}
    </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;
}

const crown = '<path d="M34 76h52l-5 13H39l-5-13Zm4-38 16 15 11-24 11 24 16-15-8 31H46L38 38Z" fill="#fff" opacity=".92"/>';
const knight = '<path d="M43 88h39v-9H69c10-12 18-25 7-42-8-12-24-12-32-3 10 1 14 7 14 13-8 0-16 5-18 13 8 0 14 3 17 9l-14 10v9Z" fill="#fff" opacity=".92"/>';
const rook = '<path d="M39 35h10v10h9V35h14v10h9V35h10v22H84v31H46V57h-7V35Z" fill="#fff" opacity=".92"/>';
const pawn = '<path d="M60 31a16 16 0 0 1 8 30l12 27H40l12-27a16 16 0 0 1 8-30Z" fill="#fff" opacity=".92"/>';
const bishop = '<path d="M60 26c14 13 19 24 9 37l13 25H38l13-25c-10-13-5-24 9-37Z" fill="#fff" opacity=".92"/>';
const queen = '<path d="M32 49a9 9 0 1 1 13-8l12 25 12-25a9 9 0 1 1 12 8l-8 35H47l-8-35Z" fill="#fff" opacity=".92"/>';

// Premium avatars shapes
const king = '<path d="M37 78h46l-4 9H41l-4-9Zm2-4a14 14 0 0 1 10-22l5-16h-7v-5h7v-6h5v6h7v5h-7l5 16a14 14 0 0 1 10 22H39Z" fill="#fff" opacity=".95"/>';
const wizard = '<path d="M30 80l10-30L48 20l5 10l5-10l8 24L78 80H30Zm28-52c-3 4-7 10-8 17h16c-1-7-4-13-8-17Z" fill="#fff" opacity=".95"/>';

const smile = '<path d="M49 74c6 7 16 7 22 0" fill="none" stroke="#171717" stroke-width="5" stroke-linecap="round" opacity=".55"/>';
const focus = '<circle cx="50" cy="58" r="4" fill="#171717" opacity=".55"/><circle cx="70" cy="58" r="4" fill="#171717" opacity=".55"/>';

export const avatarOptions = [
  { id: "crown", name: "Crown", label: { en: "Crown", ar: "التاج" }, src: avatarSvg({ bg: ["#8b5e24", "#d5a85f"], accent: "#fff1c2", shape: crown, face: focus }) },
  { id: "knight", name: "Knight", label: { en: "Knight", ar: "الحصان" }, src: avatarSvg({ bg: ["#0f766e", "#67e8f9"], accent: "#ecfeff", shape: knight, face: smile }) },
  { id: "rook", name: "Rook", label: { en: "Rook", ar: "القلعة" }, src: avatarSvg({ bg: ["#4338ca", "#a78bfa"], accent: "#eef2ff", shape: rook, face: focus }) },
  { id: "pawn", name: "Pawn", label: { en: "Pawn", ar: "الجندي" }, src: avatarSvg({ bg: ["#be123c", "#fb7185"], accent: "#fff1f2", shape: pawn, face: smile }) },
  { id: "bishop", name: "Bishop", label: { en: "Bishop", ar: "الفيل" }, src: avatarSvg({ bg: ["#334155", "#94a3b8"], accent: "#f8fafc", shape: bishop, face: focus }) },
  { id: "queen", name: "Queen", label: { en: "Queen", ar: "الملكة" }, src: avatarSvg({ bg: ["#7c2d12", "#f97316"], accent: "#ffedd5", shape: queen, face: smile }) }
];

export const shopAvatars = {
  avatar_king: { id: "avatar_king", name: "Royal King", label: { en: "Royal King", ar: "الملك الملكي" }, src: avatarSvg({ bg: ["#1e1b4b", "#4f46e5"], accent: "#fbbf24", shape: king, face: focus }) },
  avatar_wizard: { id: "avatar_wizard", name: "Chess Wizard", label: { en: "Chess Wizard", ar: "ساحر الشطرنج" }, src: avatarSvg({ bg: ["#311042", "#8b5cf6"], accent: "#06b6d4", shape: wizard, face: smile }) }
};

export function getAvatarSrc(value) {
  const option = [...avatarOptions, ...Object.values(shopAvatars)].find((avatar) => avatar.id === value || avatar.src === value);
  return option?.src || value;
}

export function normalizeAvatarValue(value) {
  const option = [...avatarOptions, ...Object.values(shopAvatars)].find((avatar) => avatar.id === value || avatar.src === value);
  return option?.id || value || "";
}
