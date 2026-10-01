'use client';

import React from 'react';
import { Tile as TileType } from '@/lib/mahjong/types';

interface TileProps {
  tile?: TileType;
  faceDown?: boolean;
  selected?: boolean;
  highlighted?: boolean;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  horizontal?: boolean; // For sideways tiles in exposed melds
}

export const Tile: React.FC<TileProps> = ({
  tile,
  faceDown = false,
  selected = false,
  highlighted = false,
  disabled = false,
  size = 'md',
  onClick,
  className = '',
  horizontal = false,
}) => {
  // Dimension ratios (Standard Mahjong tile ratio ~ 3:4)
  const sizeClasses = {
    xs: horizontal
      ? 'w-7 h-5 sm:w-8 sm:h-6 aspect-[4/3]'
      : 'w-5 h-7 sm:w-6 sm:h-8 aspect-[3/4]',
    sm: horizontal
      ? 'w-8 h-6 sm:w-10 sm:h-7 aspect-[4/3]'
      : 'w-6 h-8 sm:w-7 sm:h-10 aspect-[3/4]',
    md: horizontal
      ? 'w-[32px] h-[24px] min-[380px]:w-[35px] min-[380px]:h-[26px] sm:w-14 sm:h-10 md:w-15 md:h-11 aspect-[4/3]'
      : 'w-[23px] h-[32px] min-[360px]:w-[24px] min-[360px]:h-[33px] min-[390px]:w-[26px] min-[390px]:h-[36px] min-[430px]:w-[28px] min-[430px]:h-[38px] sm:w-10 sm:h-14 md:w-11 md:h-15 lg:w-12 lg:h-16 aspect-[3/4]',
    lg: horizontal
      ? 'w-14 h-10 sm:w-18 sm:h-13 aspect-[4/3]'
      : 'w-10 h-14 sm:w-13 sm:h-18 md:w-15 md:h-20 aspect-[3/4]',
  }[size];

  // Face-down tile (Bamboo/Jade green layered back)
  if (faceDown || !tile) {
    return (
      <div
        className={`
          relative rounded-[4px] sm:rounded-[5px] select-none cursor-default shrink-0
          bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-950
          border border-emerald-500/50
          transition-all duration-200
          ${sizeClasses}
          ${className}
        `}
        style={{
          boxShadow:
            '0 4px 6px -1px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.4), inset 0 -2px 2px rgba(0, 0, 0, 0.4), inset -1px 0 2px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Subtle engraved bamboo diamond / coin pattern on tile back */}
        <div className="absolute inset-0.5 sm:inset-1 rounded-[3px] border border-emerald-400/25 flex items-center justify-center overflow-hidden">
          <div className="w-2.5 h-2.5 sm:w-4 sm:h-4 border border-emerald-300/40 rotate-45 rounded-sm flex items-center justify-center">
            <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-emerald-300/50"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`
        relative rounded-[4px] sm:rounded-[5px] select-none cursor-pointer shrink-0
        bg-gradient-to-b from-[#ffffff] via-[#faf7f0] to-[#eee5d3]
        border border-[#e0d6be] border-b-2 border-b-[#c2b498]
        flex flex-col items-center justify-center p-0.5
        transition-all duration-150 ease-out
        ${sizeClasses}
        ${selected ? '-translate-y-2 sm:-translate-y-3 ring-2 ring-amber-400 ring-offset-1 sm:ring-offset-2 ring-offset-slate-900 shadow-2xl' : 'shadow-md hover:-translate-y-1 hover:shadow-lg'}
        ${highlighted ? 'ring-2 ring-red-500 animate-pulse' : ''}
        ${disabled ? 'opacity-60 cursor-not-allowed' : 'active:translate-y-0'}
        ${className}
      `}
      style={{
        boxShadow: selected
          ? '0 12px 20px -3px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(255,255,255,0.9), inset 0 -2px 2px rgba(0,0,0,0.1)'
          : '0 3px 6px -1px rgba(0, 0, 0, 0.35), 0 2px 4px -2px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.95), inset 0 -1.5px 2px rgba(0,0,0,0.12)',
      }}
      title={`${tile.name} (${tile.chinese})`}
    >
      {/* Dual layer edge highlight representing bone + bamboo backing */}
      <div className="absolute inset-0 rounded-[3px] sm:rounded-[4px] pointer-events-none border-t border-t-white/90 border-l border-l-white/60 border-r border-r-amber-200/40 border-b border-b-amber-300/50" />

      {/* Face Graphic */}
      <div className="relative w-full h-full flex items-center justify-center p-0.5 z-10 overflow-hidden">
        <TileFaceSVG tile={tile} size={size} />
      </div>

      {/* Subtle corner indicator for quick recognition on small screens */}
      <div className="hidden min-[390px]:block absolute top-0.5 left-0.5 sm:left-1 text-[6px] sm:text-[7px] text-slate-400/70 font-mono font-bold leading-none pointer-events-none z-20">
        {tile.suit === 'wan' && `${tile.value}w`}
        {tile.suit === 'tong' && `${tile.value}t`}
        {tile.suit === 'tiao' && `${tile.value}s`}
      </div>
    </div>
  );
};

// ==========================================
// PURE VECTOR SVG GRAPHICS FOR EVERY TILE
// ==========================================

const TileFaceSVG: React.FC<{ tile: TileType; size: 'xs' | 'sm' | 'md' | 'lg' }> = ({ tile, size }) => {
  switch (tile.suit) {
    case 'wan':
      return <WanGraphic value={tile.value} size={size} />;
    case 'tong':
      return <TongGraphic value={tile.value} />;
    case 'tiao':
      return <TiaoGraphic value={tile.value} />;
    case 'wind':
      return <WindGraphic value={tile.value} size={size} />;
    case 'dragon':
      return <DragonGraphic value={tile.value} size={size} />;
    case 'flower':
      return <FlowerGraphic value={tile.value} size={size} />;
    default:
      return <span className="text-xs font-bold">{tile.name}</span>;
  }
};

// ------------------------------------------
// 1. WAN (Characters / 萬)
// ------------------------------------------
const WanGraphic: React.FC<{ value: number; size: 'xs' | 'sm' | 'md' | 'lg' }> = ({ value, size }) => {
  const chineseNums = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const numChar = chineseNums[value - 1] || '一';
  const numColor = value === 1 ? 'text-[#1e3a8a]' : 'text-[#1e293b]';

  // Neatly proportioned font sizes by tile size
  const fontSizes = {
    xs: 'text-[8px] sm:text-[9px] leading-tight',
    sm: 'text-[9px] sm:text-[11px] leading-tight',
    md: 'text-[11px] min-[390px]:text-[12px] sm:text-[15px] md:text-[16px] leading-tight',
    lg: 'text-[16px] sm:text-[19px] leading-tight',
  }[size];

  return (
    <div className={`w-full h-full flex flex-col items-center justify-center select-none font-serif ${fontSizes}`}>
      <span className={`${numColor} font-black tracking-tight leading-none`}>
        {numChar}
      </span>
      <span className="text-[#dc2626] font-black -mt-0.5 leading-none">
        萬
      </span>
    </div>
  );
};

// ------------------------------------------
// 2. TONG (Dots / 筒) - Authentic Vector Circles
// ------------------------------------------
interface DotProps {
  cx: number;
  cy: number;
  r?: number;
  color?: 'red' | 'green' | 'blue';
  rosette?: boolean;
}

const CircleDot: React.FC<DotProps> = ({ cx, cy, r = 6, color = 'green', rosette = false }) => {
  const fill = color === 'red' ? '#dc2626' : color === 'blue' ? '#1d4ed8' : '#059669';
  const stroke = color === 'red' ? '#991b1b' : color === 'blue' ? '#1e40af' : '#065f46';

  if (rosette) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth="1" />
        <circle cx={cx} cy={cy} r={r * 0.65} fill="#ffffff" opacity="0.3" />
        <circle cx={cx} cy={cy} r={r * 0.35} fill="#ffffff" />
        <circle cx={cx} cy={cy} r={r * 0.15} fill={fill} />
      </g>
    );
  }

  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth="0.8" />
      <circle cx={cx} cy={cy} r={r * 0.55} fill="#ffffff" opacity="0.4" />
      <circle cx={cx} cy={cy} r={r * 0.25} fill="#ffffff" />
    </g>
  );
};

const TongGraphic: React.FC<{ value: number }> = ({ value }) => {
  if (value === 1) {
    return (
      <svg viewBox="0 0 50 65" className="w-full h-full p-1">
        <circle cx="25" cy="32.5" r="18" fill="#059669" stroke="#047857" strokeWidth="1.5" />
        {Array.from({ length: 16 }).map((_, i) => {
          const angle = (i * 360) / 16;
          return (
            <line
              key={i}
              x1="25"
              y1="32.5"
              x2={25 + 16 * Math.cos((angle * Math.PI) / 180)}
              y2={32.5 + 16 * Math.sin((angle * Math.PI) / 180)}
              stroke="#ffffff"
              strokeWidth="0.8"
              opacity="0.6"
            />
          );
        })}
        <circle cx="25" cy="32.5" r="11" fill="#dc2626" stroke="#b91c1c" strokeWidth="1" />
        <circle cx="25" cy="32.5" r="7.5" fill="#fef08a" opacity="0.9" />
        <circle cx="25" cy="32.5" r="4" fill="#dc2626" />
        <circle cx="25" cy="32.5" r="1.5" fill="#ffffff" />
      </svg>
    );
  }

  if (value === 2) {
    return (
      <svg viewBox="0 0 50 65" className="w-full h-full p-1">
        <CircleDot cx={25} cy={18} r={9} color="green" rosette />
        <CircleDot cx={25} cy={47} r={9} color="green" rosette />
      </svg>
    );
  }

  if (value === 3) {
    return (
      <svg viewBox="0 0 50 65" className="w-full h-full p-1">
        <CircleDot cx={14} cy={15} r={7.5} color="blue" rosette />
        <CircleDot cx={25} cy={32.5} r={7.5} color="red" rosette />
        <CircleDot cx={36} cy={50} r={7.5} color="green" rosette />
      </svg>
    );
  }

  if (value === 4) {
    return (
      <svg viewBox="0 0 50 65" className="w-full h-full p-1">
        <CircleDot cx={16} cy={18} r={7} color="blue" rosette />
        <CircleDot cx={34} cy={18} r={7} color="green" rosette />
        <CircleDot cx={16} cy={47} r={7} color="green" rosette />
        <CircleDot cx={34} cy={47} r={7} color="blue" rosette />
      </svg>
    );
  }

  if (value === 5) {
    return (
      <svg viewBox="0 0 50 65" className="w-full h-full p-1">
        <CircleDot cx={15} cy={16} r={6.5} color="blue" rosette />
        <CircleDot cx={35} cy={16} r={6.5} color="green" rosette />
        <CircleDot cx={25} cy={32.5} r={7.5} color="red" rosette />
        <CircleDot cx={15} cy={49} r={6.5} color="green" rosette />
        <CircleDot cx={35} cy={49} r={6.5} color="blue" rosette />
      </svg>
    );
  }

  if (value === 6) {
    return (
      <svg viewBox="0 0 50 65" className="w-full h-full p-1">
        <CircleDot cx={16} cy={14} r={6} color="green" rosette />
        <CircleDot cx={34} cy={14} r={6} color="green" rosette />
        <CircleDot cx={16} cy={33} r={6} color="red" rosette />
        <CircleDot cx={34} cy={33} r={6} color="red" rosette />
        <CircleDot cx={16} cy={49} r={6} color="red" rosette />
        <CircleDot cx={34} cy={49} r={6} color="red" rosette />
      </svg>
    );
  }

  if (value === 7) {
    return (
      <svg viewBox="0 0 50 65" className="w-full h-full p-1">
        <CircleDot cx={12} cy={10} r={5} color="green" />
        <CircleDot cx={25} cy={16} r={5} color="green" />
        <CircleDot cx={38} cy={22} r={5} color="green" />
        <CircleDot cx={16} cy={37} r={5.5} color="red" rosette />
        <CircleDot cx={34} cy={37} r={5.5} color="red" rosette />
        <CircleDot cx={16} cy={51} r={5.5} color="red" rosette />
        <CircleDot cx={34} cy={51} r={5.5} color="red" rosette />
      </svg>
    );
  }

  if (value === 8) {
    return (
      <svg viewBox="0 0 50 65" className="w-full h-full p-1">
        <CircleDot cx={16} cy={11} r={5} color="blue" rosette />
        <CircleDot cx={34} cy={11} r={5} color="blue" rosette />
        <CircleDot cx={16} cy={25} r={5} color="blue" rosette />
        <CircleDot cx={34} cy={25} r={5} color="blue" rosette />
        <CircleDot cx={16} cy={39} r={5} color="blue" rosette />
        <CircleDot cx={34} cy={39} r={5} color="blue" rosette />
        <CircleDot cx={16} cy={53} r={5} color="blue" rosette />
        <CircleDot cx={34} cy={53} r={5} color="blue" rosette />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 50 65" className="w-full h-full p-1">
      <CircleDot cx={13} cy={14} r={5} color="green" rosette />
      <CircleDot cx={25} cy={14} r={5} color="green" rosette />
      <CircleDot cx={37} cy={14} r={5} color="green" rosette />
      <CircleDot cx={13} cy={32.5} r={5} color="red" rosette />
      <CircleDot cx={25} cy={32.5} r={5} color="red" rosette />
      <CircleDot cx={37} cy={32.5} r={5} color="red" rosette />
      <CircleDot cx={13} cy={51} r={5} color="blue" rosette />
      <CircleDot cx={25} cy={51} r={5} color="blue" rosette />
      <CircleDot cx={37} cy={51} r={5} color="blue" rosette />
    </svg>
  );
};

// ------------------------------------------
// 3. TIAO (Bamboo / 條) - Authentic Bamboo & Peacock
// ------------------------------------------
interface BambooStickProps {
  x: number;
  y: number;
  h?: number;
  w?: number;
  color?: 'green' | 'red';
}

const BambooStick: React.FC<BambooStickProps> = ({ x, y, h = 16, w = 4.5, color = 'green' }) => {
  const fill = color === 'red' ? '#dc2626' : '#059669';
  const stroke = color === 'red' ? '#991b1b' : '#047857';

  return (
    <g>
      <rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        rx={w / 3}
        fill={fill}
        stroke={stroke}
        strokeWidth="0.6"
      />
      <line
        x1={x - w / 2}
        y1={y}
        x2={x + w / 2}
        y2={y}
        stroke="#ffffff"
        strokeWidth="0.8"
        opacity="0.8"
      />
      <circle cx={x} cy={y} r={w / 4} fill="#ffffff" />
    </g>
  );
};

const TiaoGraphic: React.FC<{ value: number }> = ({ value }) => {
  if (value === 1) {
    return (
      <svg viewBox="0 0 50 65" className="w-full h-full p-1">
        <path d="M 5 54 Q 25 51 45 55" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M 12 53 Q 15 50 17 53" stroke="#047857" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M 25 36 Q 38 12 40 18 Q 32 32 25 38" fill="#047857" stroke="#065f46" strokeWidth="0.7" />
        <circle cx="37" cy="18" r="2.5" fill="#dc2626" />
        <circle cx="37" cy="18" r="1.2" fill="#fef08a" />
        <path d="M 25 36 Q 44 26 43 32 Q 33 40 25 40" fill="#059669" stroke="#065f46" strokeWidth="0.7" />
        <circle cx="41" cy="30" r="2.2" fill="#1d4ed8" />
        <circle cx="41" cy="30" r="1" fill="#fef08a" />
        <path d="M 25 36 Q 30 8 32 14 Q 27 28 25 36" fill="#059669" stroke="#065f46" strokeWidth="0.7" />
        <circle cx="30" cy="13" r="2.2" fill="#1d4ed8" />
        <ellipse cx="23" cy="38" rx="8" ry="11" fill="#047857" stroke="#064e3b" strokeWidth="0.8" />
        <path d="M 17 32 Q 15 42 22 47 Q 22 36 17 32" fill="#10b981" />
        <path d="M 18 30 Q 15 22 17 18 Q 23 18 23 26" fill="#047857" stroke="#064e3b" strokeWidth="0.6" />
        <circle cx="18" cy="17" r="4.5" fill="#047857" />
        <path d="M 17 13 Q 13 8 11 10" stroke="#dc2626" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        <circle cx="11" cy="10" r="1.3" fill="#dc2626" />
        <circle cx="16.5" cy="16" r="1.2" fill="#ffffff" />
        <circle cx="16.2" cy="16" r="0.6" fill="#000000" />
        <polygon points="14,17 9,18 14,19" fill="#f59e0b" />
        <line x1="20" y1="48" x2="20" y2="53" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="24" y1="48" x2="25" y2="53" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (value === 2) {
    return (
      <svg viewBox="0 0 50 65" className="w-full h-full p-1">
        <BambooStick x={25} y={19} h={20} w={6} color="green" />
        <BambooStick x={25} y={45} h={20} w={6} color="green" />
      </svg>
    );
  }

  if (value === 3) {
    return (
      <svg viewBox="0 0 50 65" className="w-full h-full p-1">
        <BambooStick x={25} y={17} h={18} w={5.5} color="green" />
        <BambooStick x={16} y={44} h={18} w={5.5} color="green" />
        <BambooStick x={34} y={44} h={18} w={5.5} color="green" />
      </svg>
    );
  }

  if (value === 4) {
    return (
      <svg viewBox="0 0 50 65" className="w-full h-full p-1">
        <BambooStick x={16} y={19} h={18} w={5} color="green" />
        <BambooStick x={34} y={19} h={18} w={5} color="green" />
        <BambooStick x={16} y={45} h={18} w={5} color="green" />
        <BambooStick x={34} y={45} h={18} w={5} color="green" />
      </svg>
    );
  }

  if (value === 5) {
    return (
      <svg viewBox="0 0 50 65" className="w-full h-full p-1">
        <BambooStick x={15} y={17} h={17} w={4.5} color="green" />
        <BambooStick x={35} y={17} h={17} w={4.5} color="green" />
        <BambooStick x={25} y={32.5} h={17} w={5} color="red" />
        <BambooStick x={15} y={48} h={17} w={4.5} color="green" />
        <BambooStick x={35} y={48} h={17} w={4.5} color="green" />
      </svg>
    );
  }

  if (value === 6) {
    return (
      <svg viewBox="0 0 50 65" className="w-full h-full p-1">
        <BambooStick x={14} y={18} h={18} w={4.5} color="green" />
        <BambooStick x={25} y={18} h={18} w={4.5} color="green" />
        <BambooStick x={36} y={18} h={18} w={4.5} color="green" />
        <BambooStick x={14} y={46} h={18} w={4.5} color="green" />
        <BambooStick x={25} y={46} h={18} w={4.5} color="green" />
        <BambooStick x={36} y={46} h={18} w={4.5} color="green" />
      </svg>
    );
  }

  if (value === 7) {
    return (
      <svg viewBox="0 0 50 65" className="w-full h-full p-1">
        <BambooStick x={25} y={14} h={14} w={5} color="red" />
        <BambooStick x={14} y={34} h={14} w={4.5} color="green" />
        <BambooStick x={25} y={34} h={14} w={4.5} color="green" />
        <BambooStick x={36} y={34} h={14} w={4.5} color="green" />
        <BambooStick x={14} y={51} h={14} w={4.5} color="green" />
        <BambooStick x={25} y={51} h={14} w={4.5} color="green" />
        <BambooStick x={36} y={51} h={14} w={4.5} color="green" />
      </svg>
    );
  }

  if (value === 8) {
    return (
      <svg viewBox="0 0 50 65" className="w-full h-full p-1">
        <BambooStick x={11} y={18} h={17} w={4} color="green" />
        <BambooStick x={20} y={18} h={17} w={4} color="green" />
        <BambooStick x={30} y={18} h={17} w={4} color="green" />
        <BambooStick x={39} y={18} h={17} w={4} color="green" />
        <BambooStick x={11} y={46} h={17} w={4} color="green" />
        <BambooStick x={20} y={46} h={17} w={4} color="green" />
        <BambooStick x={30} y={46} h={17} w={4} color="green" />
        <BambooStick x={39} y={46} h={17} w={4} color="green" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 50 65" className="w-full h-full p-1">
      <BambooStick x={14} y={13} h={13} w={4} color="green" />
      <BambooStick x={25} y={13} h={13} w={4} color="green" />
      <BambooStick x={36} y={13} h={13} w={4} color="green" />
      <BambooStick x={14} y={32.5} h={13} w={4} color="red" />
      <BambooStick x={25} y={32.5} h={13} w={4} color="red" />
      <BambooStick x={36} y={32.5} h={13} w={4} color="red" />
      <BambooStick x={14} y={52} h={13} w={4} color="green" />
      <BambooStick x={25} y={52} h={13} w={4} color="green" />
      <BambooStick x={36} y={52} h={13} w={4} color="green" />
    </svg>
  );
};

// ------------------------------------------
// 4. WINDS (東, 南, 西, 北) - Balanced Proportions
// ------------------------------------------
const WindGraphic: React.FC<{ value: number; size: 'xs' | 'sm' | 'md' | 'lg' }> = ({ value, size }) => {
  const windChars = ['東', '南', '西', '北'];
  const char = windChars[value - 1] || '東';

  // Neatly proportioned font sizes with ample breathing room
  const fontSizes = {
    xs: 'text-[10px] sm:text-[12px]',
    sm: 'text-[11px] sm:text-[14px]',
    md: 'text-[13px] min-[390px]:text-[14px] sm:text-[18px] md:text-[20px]',
    lg: 'text-[18px] sm:text-[24px]',
  }[size];

  return (
    <div className={`w-full h-full flex items-center justify-center font-serif font-black text-[#1e3a8a] ${fontSizes} select-none leading-none p-0.5`}>
      {char}
    </div>
  );
};

// ------------------------------------------
// 5. DRAGONS (中, 發, 白板) - Balanced Proportions
// ------------------------------------------
const DragonGraphic: React.FC<{ value: number; size: 'xs' | 'sm' | 'md' | 'lg' }> = ({ value, size }) => {
  const fontSizes = {
    xs: 'text-[10px] sm:text-[12px]',
    sm: 'text-[11px] sm:text-[14px]',
    md: 'text-[13px] min-[390px]:text-[14px] sm:text-[18px] md:text-[20px]',
    lg: 'text-[18px] sm:text-[24px]',
  }[size];

  if (value === 1) {
    // Red Dragon (中)
    return (
      <div className={`w-full h-full flex items-center justify-center font-serif font-black text-[#dc2626] ${fontSizes} select-none leading-none p-0.5`}>
        中
      </div>
    );
  }

  if (value === 2) {
    // Green Dragon (發)
    return (
      <div className={`w-full h-full flex items-center justify-center font-serif font-black text-[#047857] ${fontSizes} select-none leading-none p-0.5`}>
        發
      </div>
    );
  }

  // White Dragon (白板 / Pak) - Clean ivory with authentic blue double frame
  return (
    <svg viewBox="0 0 50 65" className="w-full h-full p-1.5">
      <rect
        x="6"
        y="6"
        width="38"
        height="53"
        rx="3"
        fill="none"
        stroke="#1d4ed8"
        strokeWidth="2.5"
      />
      <rect
        x="10.5"
        y="10.5"
        width="29"
        height="44"
        rx="2"
        fill="none"
        stroke="#60a5fa"
        strokeWidth="1"
        strokeDasharray="4 2"
      />
    </svg>
  );
};

// ------------------------------------------
// 6. FLOWERS & SEASONS (八仙花牌)
// ------------------------------------------
const FlowerGraphic: React.FC<{ value: number; size: 'xs' | 'sm' | 'md' | 'lg' }> = ({ value, size }) => {
  const names = ['春', '夏', '秋', '冬', '梅', '蘭', '菊', '竹'];
  const char = names[value - 1] || '花';
  const isSeason = value <= 4;
  const numIndex = ((value - 1) % 4) + 1;
  const color = isSeason ? '#dc2626' : '#1d4ed8';

  const fontSizes = {
    xs: 'text-[8px] sm:text-[9px]',
    sm: 'text-[9px] sm:text-[11px]',
    md: 'text-[10px] min-[390px]:text-[11px] sm:text-[14px] md:text-[16px]',
    lg: 'text-[14px] sm:text-[18px]',
  }[size];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center select-none font-serif leading-none relative">
      <span
        className="absolute top-0.5 right-0.5 text-[6px] sm:text-[7px] font-bold font-mono"
        style={{ color }}
      >
        {numIndex}
      </span>
      <span
        className={`font-black ${fontSizes} mt-0.5`}
        style={{ color }}
      >
        {char}
      </span>
      <span className="hidden min-[390px]:block text-[5.5px] sm:text-[6.5px] text-amber-700/80 font-bold uppercase tracking-wider mt-0.5">
        {isSeason ? 'Season' : 'Flower'}
      </span>
    </div>
  );
};
