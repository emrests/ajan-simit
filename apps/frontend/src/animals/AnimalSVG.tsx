import React from 'react'
import type { AnimalType, AgentStatus } from '@smith/types'

interface AnimalSVGProps {
  animal: AnimalType
  status: AgentStatus
  size?: number
  color?: string
  seated?: boolean
}

// Her hayvan için renk temaları
const ANIMAL_COLORS: Record<AnimalType, { body: string; accent: string; ear?: string }> = {
  bear: { body: '#c8956c', accent: '#a06040', ear: '#b07858' },
  fox: { body: '#e8834a', accent: '#c05820', ear: '#e8834a' },
  raccoon: { body: '#9090a0', accent: '#404050', ear: '#707080' },
  owl: { body: '#c8a060', accent: '#806030', ear: '#b08040' },
  elephant: { body: '#a0a8c0', accent: '#707888', ear: '#909ab0' },
  octopus: { body: '#c878c8', accent: '#905090', ear: '#b860b8' },
  rabbit: { body: '#f0d8d0', accent: '#d0a8a0', ear: '#e8b0b0' },
  squirrel: { body: '#c87838', accent: '#905020', ear: '#b86828' },
  cat: { body: '#e8c898', accent: '#c0a068', ear: '#d8b080' },
  dog: { body: '#d4a870', accent: '#a07840', ear: '#c09060' },
}

// Göz ifadesi duruma göre değişir
function Eyes({ status, cx = 50, cy = 44 }: { status: AgentStatus; cx?: number; cy?: number }) {
  if (status === 'waiting') {
    // Odaklanmış göz (ekrana bakıyor)
    return (
      <>
        <ellipse cx={cx - 7} cy={cy} rx="3.5" ry="3" fill="#3d2b1f" />
        <ellipse cx={cx - 7} cy={cy - 1} rx="1" ry="1" fill="white" />
        <ellipse cx={cx + 7} cy={cy} rx="3.5" ry="3" fill="#3d2b1f" />
        <ellipse cx={cx + 7} cy={cy - 1} rx="1" ry="1" fill="white" />
      </>
    )
  }
  if (status === 'celebrating') {
    // Mutlu kavisli göz
    return (
      <>
        <path d={`M${cx - 10},${cy + 1} Q${cx - 7},${cy - 3} ${cx - 4},${cy + 1}`} stroke="#3d2b1f" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d={`M${cx + 4},${cy + 1} Q${cx + 7},${cy - 3} ${cx + 10},${cy + 1}`} stroke="#3d2b1f" strokeWidth="2" fill="none" strokeLinecap="round" />
      </>
    )
  }
  if (status === 'thinking') {
    // Yan bakan göz
    return (
      <>
        <ellipse cx={cx - 7} cy={cy} rx="3.5" ry="3" fill="#3d2b1f" />
        <ellipse cx={cx - 6} cy={cy - 1} rx="1" ry="1" fill="white" />
        <ellipse cx={cx + 7} cy={cy} rx="3.5" ry="3" fill="#3d2b1f" />
        <ellipse cx={cx + 8} cy={cy - 1} rx="1" ry="1" fill="white" />
      </>
    )
  }
  // Normal göz
  return (
    <>
      <ellipse cx={cx - 7} cy={cy} rx="3.5" ry="3.5" fill="#3d2b1f" />
      <ellipse cx={cx - 6} cy={cy - 1.5} rx="1.2" ry="1.2" fill="white" />
      <ellipse cx={cx + 7} cy={cy} rx="3.5" ry="3.5" fill="#3d2b1f" />
      <ellipse cx={cx + 8} cy={cy - 1.5} rx="1.2" ry="1.2" fill="white" />
    </>
  )
}

function Mouth({ status, cx = 50, cy = 53 }: { status: AgentStatus; cx?: number; cy?: number }) {
  if (status === 'celebrating') {
    return <path d={`M${cx - 7},${cy - 2} Q${cx},${cy + 5} ${cx + 7},${cy - 2}`} stroke="#3d2b1f" strokeWidth="1.5" fill="#ff9999" strokeLinecap="round" />
  }
  if (status === 'waiting') {
    return <path d={`M${cx - 4},${cy} Q${cx},${cy + 2} ${cx + 4},${cy}`} stroke="#3d2b1f" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  }
  return <path d={`M${cx - 5},${cy - 1} Q${cx},${cy + 3} ${cx + 5},${cy - 1}`} stroke="#3d2b1f" strokeWidth="1.5" fill="none" strokeLinecap="round" />
}

// Çalışma efekti (durum balonu değil, karakter üstündeki küçük ikon)
function StatusIcon({ status }: { status: AgentStatus }) {
  if (status === 'thinking') {
    return (
      <g>
        <circle cx="68" cy="20" r="5" fill="white" stroke="#e0c8a8" strokeWidth="1" opacity="0.9" />
        <text x="68" y="23" textAnchor="middle" fontSize="6" fill="#3d2b1f">?</text>
      </g>
    )
  }
  if (status === 'typing') {
    return (
      <g>
        <rect x="62" y="75" width="24" height="10" rx="2" fill="#c8a882" opacity="0.9" />
        <rect x="64" y="77" width="4" height="2" rx="0.5" fill="white" opacity="0.7" />
        <rect x="70" y="77" width="4" height="2" rx="0.5" fill="white" opacity="0.7" />
        <rect x="76" y="77" width="4" height="2" rx="0.5" fill="white" opacity="0.7" />
        <rect x="64" y="81" width="4" height="2" rx="0.5" fill="white" opacity="0.7" />
        <rect x="70" y="81" width="8" height="2" rx="0.5" fill="white" opacity="0.7" />
      </g>
    )
  }
  if (status === 'waiting') {
    return (
      <g>
        <circle cx="64" cy="18" r="2" fill="#e8a020" opacity="0.9">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="70" cy="18" r="2" fill="#e8a020" opacity="0.9">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin="0.3s" repeatCount="indefinite" />
        </circle>
        <circle cx="76" cy="18" r="2" fill="#e8a020" opacity="0.9">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin="0.6s" repeatCount="indefinite" />
        </circle>
      </g>
    )
  }
  if (status === 'celebrating') {
    return (
      <>
        <text x="30" y="20" fontSize="8">🎉</text>
        <text x="65" y="18" fontSize="8">✨</text>
      </>
    )
  }
  return null
}

export function AnimalSVG({ animal, status, size = 100, seated = false }: AnimalSVGProps) {
  const colors = ANIMAL_COLORS[animal]

  // Her hayvan için temel yuvarlak karakter gövdesi
  // Basit, sevimli, birbirine benzer ama farklı kulak/özelliklerle
  const renderAnimal = () => {
    switch (animal) {
      case 'bear':
        return (
          <>
            {/* Kulaklar */}
            <circle cx="33" cy="27" r="10" fill={colors.body} />
            <circle cx="67" cy="27" r="10" fill={colors.body} />
            <circle cx="33" cy="27" r="6" fill={colors.accent} />
            <circle cx="67" cy="27" r="6" fill={colors.accent} />
            {/* Gövde */}
            <ellipse cx="50" cy="58" rx="22" ry="18" fill={colors.body} />
            {/* Kafa */}
            <circle cx="50" cy="45" r="22" fill={colors.body} />
            {/* Burun bölgesi */}
            <ellipse cx="50" cy="52" rx="9" ry="7" fill={colors.accent} opacity="0.5" />
            <ellipse cx="50" cy="52" rx="4" ry="3" fill="#3d2b1f" />
            {/* Eller */}
            <circle cx="28" cy="72" r="7" fill={colors.body} />
            <circle cx="72" cy="72" r="7" fill={colors.body} />
          </>
        )
      case 'fox':
        return (
          <>
            {/* Sivri kulaklar */}
            <polygon points="28,30 20,10 38,25" fill={colors.body} />
            <polygon points="72,30 80,10 62,25" fill={colors.body} />
            <polygon points="29,29 22,13 37,26" fill="#fff0e8" />
            <polygon points="71,29 78,13 63,26" fill="#fff0e8" />
            {/* Gövde */}
            <ellipse cx="50" cy="60" rx="20" ry="16" fill={colors.body} />
            {/* Kafa */}
            <ellipse cx="50" cy="45" rx="21" ry="20" fill={colors.body} />
            {/* Yüz akı */}
            <ellipse cx="50" cy="49" rx="12" ry="10" fill="#fff0e8" />
            {/* Burun */}
            <ellipse cx="50" cy="51" rx="4" ry="3" fill="#3d2b1f" />
            {/* Eller */}
            <ellipse cx="30" cy="70" rx="6" ry="7" fill={colors.body} />
            <ellipse cx="70" cy="70" rx="6" ry="7" fill={colors.body} />
          </>
        )
      case 'raccoon':
        return (
          <>
            {/* Yuvarlak kulaklar */}
            <circle cx="34" cy="28" r="9" fill={colors.body} />
            <circle cx="66" cy="28" r="9" fill={colors.body} />
            <circle cx="34" cy="28" r="5" fill="#202030" />
            <circle cx="66" cy="28" r="5" fill="#202030" />
            {/* Gövde */}
            <ellipse cx="50" cy="60" rx="20" ry="16" fill={colors.body} />
            {/* Kafa */}
            <circle cx="50" cy="46" r="22" fill={colors.body} />
            {/* Maskeli yüz */}
            <ellipse cx="43" cy="44" rx="8" ry="6" fill="#303040" opacity="0.6" />
            <ellipse cx="57" cy="44" rx="8" ry="6" fill="#303040" opacity="0.6" />
            {/* Burun */}
            <ellipse cx="50" cy="52" rx="4" ry="3" fill="#202030" />
            {/* Eller */}
            <circle cx="29" cy="71" r="7" fill={colors.body} />
            <circle cx="71" cy="71" r="7" fill={colors.body} />
          </>
        )
      case 'owl':
        return (
          <>
            {/* Yuvarlak püsküllü kulaklar */}
            <ellipse cx="35" cy="26" rx="8" ry="10" fill={colors.body} />
            <ellipse cx="65" cy="26" rx="8" ry="10" fill={colors.body} />
            {/* Gövde */}
            <ellipse cx="50" cy="60" rx="21" ry="18" fill={colors.body} />
            {/* Kafa */}
            <circle cx="50" cy="45" r="22" fill={colors.body} />
            {/* Büyük göz çerçeveleri */}
            <circle cx="42" cy="44" r="9" fill="white" />
            <circle cx="58" cy="44" r="9" fill="white" />
            <circle cx="42" cy="44" r="6" fill="#604020" />
            <circle cx="58" cy="44" r="6" fill="#604020" />
            <circle cx="44" cy="42" r="2" fill="white" />
            <circle cx="60" cy="42" r="2" fill="white" />
            {/* Gaga */}
            <polygon points="50,50 46,55 54,55" fill="#e0a040" />
            {/* Kanatlar */}
            <ellipse cx="28" cy="66" rx="8" ry="10" fill={colors.body} />
            <ellipse cx="72" cy="66" rx="8" ry="10" fill={colors.body} />
          </>
        )
      case 'elephant':
        return (
          <>
            {/* Büyük kulaklar */}
            <ellipse cx="25" cy="42" rx="14" ry="18" fill={colors.body} />
            <ellipse cx="75" cy="42" rx="14" ry="18" fill={colors.body} />
            <ellipse cx="25" cy="42" rx="10" ry="13" fill={colors.accent} opacity="0.4" />
            <ellipse cx="75" cy="42" rx="10" ry="13" fill={colors.accent} opacity="0.4" />
            {/* Gövde */}
            <ellipse cx="50" cy="60" rx="20" ry="16" fill={colors.body} />
            {/* Kafa */}
            <circle cx="50" cy="44" r="20" fill={colors.body} />
            {/* Hortum */}
            <path d="M 45,58 Q 42,68 48,75 Q 50,78 52,75" stroke={colors.body} strokeWidth="8" fill="none" strokeLinecap="round" />
            {/* Diş */}
            <ellipse cx="36" cy="58" rx="4" ry="3" fill="white" />
            <ellipse cx="64" cy="58" rx="4" ry="3" fill="white" />
            {/* Burun delikleri */}
            <circle cx="47" cy="58" r="2" fill={colors.accent} />
            <circle cx="53" cy="58" r="2" fill={colors.accent} />
          </>
        )
      case 'octopus':
        return (
          <>
            {/* Gövde (yuvarlak top) */}
            <circle cx="50" cy="40" r="25" fill={colors.body} />
            {/* Kollar */}
            <path d="M 28,55 Q 20,65 22,78" stroke={colors.body} strokeWidth="8" fill="none" strokeLinecap="round" />
            <path d="M 36,62 Q 30,72 32,82" stroke={colors.body} strokeWidth="8" fill="none" strokeLinecap="round" />
            <path d="M 50,65 Q 50,75 48,82" stroke={colors.body} strokeWidth="8" fill="none" strokeLinecap="round" />
            <path d="M 64,62 Q 70,72 68,82" stroke={colors.body} strokeWidth="8" fill="none" strokeLinecap="round" />
            <path d="M 72,55 Q 80,65 78,78" stroke={colors.body} strokeWidth="8" fill="none" strokeLinecap="round" />
            {/* Nokta deseni */}
            <circle cx="40" cy="33" r="4" fill={colors.accent} opacity="0.4" />
            <circle cx="56" cy="30" r="3" fill={colors.accent} opacity="0.4" />
            <circle cx="63" cy="38" r="3" fill={colors.accent} opacity="0.4" />
          </>
        )
      case 'rabbit':
        return (
          <>
            {/* Uzun kulaklar */}
            <ellipse cx="38" cy="18" rx="7" ry="16" fill={colors.body} />
            <ellipse cx="62" cy="18" rx="7" ry="16" fill={colors.body} />
            <ellipse cx="38" cy="18" rx="4" ry="12" fill={colors.ear} opacity="0.5" />
            <ellipse cx="62" cy="18" rx="4" ry="12" fill={colors.ear} opacity="0.5" />
            {/* Gövde */}
            <ellipse cx="50" cy="62" rx="20" ry="17" fill={colors.body} />
            {/* Kafa */}
            <circle cx="50" cy="48" r="20" fill={colors.body} />
            {/* Burun */}
            <ellipse cx="50" cy="53" rx="3" ry="2" fill="#ffaaaa" />
            {/* Eller */}
            <circle cx="29" cy="72" r="7" fill={colors.body} />
            <circle cx="71" cy="72" r="7" fill={colors.body} />
          </>
        )
      case 'squirrel':
        return (
          <>
            {/* Küçük yuvarlak kulaklar */}
            <circle cx="35" cy="29" r="8" fill={colors.body} />
            <circle cx="65" cy="29" r="8" fill={colors.body} />
            <circle cx="35" cy="29" r="4" fill={colors.accent} opacity="0.5" />
            <circle cx="65" cy="29" r="4" fill={colors.accent} opacity="0.5" />
            {/* Kabarık kuyruk (arka) */}
            <path d="M 72,65 Q 90,55 88,35 Q 85,20 78,28 Q 82,40 75,52 Q 70,60 65,68" fill={colors.body} />
            {/* Gövde */}
            <ellipse cx="50" cy="62" rx="18" ry="16" fill={colors.body} />
            {/* Kafa */}
            <circle cx="50" cy="47" r="20" fill={colors.body} />
            {/* Şişkin yanaklar */}
            <circle cx="35" cy="50" r="8" fill={colors.accent} opacity="0.3" />
            <circle cx="65" cy="50" r="8" fill={colors.accent} opacity="0.3" />
            {/* Burun */}
            <ellipse cx="50" cy="52" rx="3" ry="2.5" fill="#3d2b1f" />
            {/* Eller */}
            <circle cx="30" cy="70" r="6" fill={colors.body} />
            <circle cx="70" cy="70" r="6" fill={colors.body} />
          </>
        )
      case 'cat':
        return (
          <>
            {/* Sivri kulaklar */}
            <polygon points="33,35 26,16 43,30" fill={colors.body} />
            <polygon points="67,35 74,16 57,30" fill={colors.body} />
            <polygon points="34,33 29,20 42,30" fill={colors.ear} opacity="0.5" />
            <polygon points="66,33 71,20 58,30" fill={colors.ear} opacity="0.5" />
            {/* Gövde */}
            <ellipse cx="50" cy="62" rx="20" ry="16" fill={colors.body} />
            {/* Kafa */}
            <circle cx="50" cy="47" r="21" fill={colors.body} />
            {/* Bıyıklar */}
            <line x1="28" y1="50" x2="42" y2="52" stroke="#3d2b1f" strokeWidth="1" opacity="0.5" />
            <line x1="28" y1="54" x2="42" y2="54" stroke="#3d2b1f" strokeWidth="1" opacity="0.5" />
            <line x1="72" y1="50" x2="58" y2="52" stroke="#3d2b1f" strokeWidth="1" opacity="0.5" />
            <line x1="72" y1="54" x2="58" y2="54" stroke="#3d2b1f" strokeWidth="1" opacity="0.5" />
            {/* Burun */}
            <polygon points="50,51 47,54 53,54" fill="#ffaaaa" />
            {/* Eller */}
            <circle cx="30" cy="70" r="7" fill={colors.body} />
            <circle cx="70" cy="70" r="7" fill={colors.body} />
          </>
        )
      case 'dog':
        return (
          <>
            {/* Sarkan kulaklar */}
            <ellipse cx="30" cy="42" rx="9" ry="14" fill={colors.accent} />
            <ellipse cx="70" cy="42" rx="9" ry="14" fill={colors.accent} />
            {/* Gövde */}
            <ellipse cx="50" cy="62" rx="21" ry="17" fill={colors.body} />
            {/* Kafa */}
            <circle cx="50" cy="46" r="22" fill={colors.body} />
            {/* Burun bölgesi */}
            <ellipse cx="50" cy="52" rx="10" ry="8" fill={colors.accent} opacity="0.4" />
            {/* Burun */}
            <ellipse cx="50" cy="52" rx="5" ry="4" fill="#3d2b1f" />
            <ellipse cx="49" cy="50.5" rx="1.5" ry="1" fill="white" opacity="0.5" />
            {/* Dil */}
            <path d="M 46,58 Q 50,63 54,58" stroke="#ff9999" strokeWidth="2" fill="#ff9999" opacity="0.8" />
            {/* Eller */}
            <circle cx="28" cy="72" r="8" fill={colors.body} />
            <circle cx="72" cy="72" r="8" fill={colors.body} />
          </>
        )
      default:
        return <circle cx="50" cy="50" r="30" fill={colors.body} />
    }
  }

  // Baykuş kendi göz sistemini kullanıyor, diğerleri paylaşımlı
  const showDefaultEyes = animal !== 'owl' && animal !== 'octopus'
  const eyeY = animal === 'rabbit' ? 46 : animal === 'squirrel' ? 45 : animal === 'cat' ? 46 : animal === 'fox' ? 46 : 44
  const eyeCX = 50

  // Bacaklar — her hayvan için kısa, sevimli oval bacaklar
  const renderLegs = () => {
    if (animal === 'octopus') {
      // Ahtapot: tentacle uçlarına küçük yuvarlak ayaklar
      return (
        <>
          <circle cx="22" cy="80" r="3" fill={colors.accent} className="leg-left" />
          <circle cx="32" cy="84" r="3" fill={colors.accent} className="leg-right" />
          <circle cx="48" cy="84" r="3" fill={colors.accent} className="leg-left" />
          <circle cx="68" cy="84" r="3" fill={colors.accent} className="leg-right" />
          <circle cx="78" cy="80" r="3" fill={colors.accent} className="leg-left" />
        </>
      )
    }
    if (animal === 'elephant') {
      // Fil: daha kalın sütun bacaklar
      return (
        <>
          <g className="leg-left">
            <ellipse cx="38" cy="80" rx="8" ry="10" fill={colors.accent} opacity="0.7" />
            <ellipse cx="38" cy="91" rx="9" ry="4" fill={colors.accent} opacity="0.8" />
          </g>
          <g className="leg-right">
            <ellipse cx="62" cy="80" rx="8" ry="10" fill={colors.accent} opacity="0.7" />
            <ellipse cx="62" cy="91" rx="9" ry="4" fill={colors.accent} opacity="0.8" />
          </g>
        </>
      )
    }
    if (animal === 'owl') {
      // Baykuş: kısa çubuk bacaklar + 3 parmaklı ayak
      return (
        <>
          <g className="leg-left">
            <rect x="38" y="76" width="4" height="10" rx="2" fill={colors.accent} />
            <circle cx="36" cy="88" r="2.5" fill={colors.accent} />
            <circle cx="40" cy="89" r="2.5" fill={colors.accent} />
            <circle cx="44" cy="88" r="2.5" fill={colors.accent} />
          </g>
          <g className="leg-right">
            <rect x="58" y="76" width="4" height="10" rx="2" fill={colors.accent} />
            <circle cx="56" cy="88" r="2.5" fill={colors.accent} />
            <circle cx="60" cy="89" r="2.5" fill={colors.accent} />
            <circle cx="64" cy="88" r="2.5" fill={colors.accent} />
          </g>
        </>
      )
    }
    // Diğer hayvanlar: standart oval bacak + ayak
    const rx = animal === 'fox' ? 5 : 6
    return (
      <>
        <g className="leg-left">
          <ellipse cx="40" cy="80" rx={rx} ry="8" fill={colors.accent} opacity="0.7" />
          <ellipse cx="40" cy="89" rx={rx + 1} ry="4" fill={colors.accent} opacity="0.8" />
        </g>
        <g className="leg-right">
          <ellipse cx="60" cy="80" rx={rx} ry="8" fill={colors.accent} opacity="0.7" />
          <ellipse cx="60" cy="89" rx={rx + 1} ry="4" fill={colors.accent} opacity="0.8" />
        </g>
      </>
    )
  }

  return (
    <svg
      viewBox={seated ? '0 0 100 78' : '0 0 100 100'}
      width={size}
      height={seated ? size * 0.78 : size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {!seated && renderLegs()}
      {renderAnimal()}
      {showDefaultEyes && <Eyes status={status} cx={eyeCX} cy={eyeY} />}
      {showDefaultEyes && animal !== 'elephant' && <Mouth status={status} cx={eyeCX} cy={eyeY + 9} />}
      <StatusIcon status={status} />
    </svg>
  )
}
