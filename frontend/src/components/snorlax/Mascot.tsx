import React, { useState } from 'react';
import snorlaxSleepingPng from '../../assets/snorlax_sleeping.png';
import snorlaxEatingPng from '../../assets/snorlax_eating.png';
import snorlaxBlockingPng from '../../assets/snorlax_blocking.png';
import { snorlaxSound } from './SoundToggle';

export type MascotPose = 'sleeping' | 'awake' | 'eating' | 'blocking' | 'munchlax' | 'belly' | 'one-eye';
export type MascotSize = 'sm' | 'md' | 'lg' | 'hero';

export interface MascotProps {
  pose?: MascotPose;
  size?: MascotSize;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
  crumbs?: boolean;
  onClick?: () => void;
}

export const Mascot: React.FC<MascotProps> = ({
  pose = 'sleeping',
  size = 'md',
  className = '',
  style,
  alt,
  crumbs = false,
  onClick,
}) => {
  const [bouncing, setBouncing] = useState(false);
  const [showHrrrm, setShowHrrrm] = useState(false);

  const handleBellyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    snorlaxSound.playHrrrm();
    setBouncing(true);
    setShowHrrrm(true);
    setTimeout(() => setBouncing(false), 500);
    setTimeout(() => setShowHrrrm(false), 1200);
    if (onClick) onClick();
  };

  // Size pixel mappings (desktop large size >= 240px for hero)
  const pixelSizes = {
    sm: 26,
    md: 56,
    lg: 96,
    hero: 245,
  };

  const px = pixelSizes[size] || 56;

  // 1. HERO, LG, MD, SM SLEEPING & BELLY POSE (Clean transparent Snorlax art matching homepage)
  if (pose === 'sleeping' || pose === 'belly') {
    const isHero = size === 'hero';
    const isLg = size === 'lg';
    const isMd = size === 'md';
    const width = isHero ? '260px' : isLg ? '120px' : isMd ? '82px' : '44px';
    const height = isHero ? '240px' : isLg ? '110px' : isMd ? '76px' : '40px';
    return (
      <div
        className={`snorlax-hero-mascot ${className} ${bouncing ? 'belly-clicked' : ''}`}
        onClick={handleBellyClick}
        title="Snorlax is sound asleep. (Click belly to tickle!)"
        style={{
          position: 'relative',
          width,
          height,
          minWidth: width,
          minHeight: height,
          backgroundColor: 'transparent',
          border: 'none',
          boxShadow: 'none',
          overflow: 'visible',
          cursor: 'pointer',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
          ...style,
        }}
      >
        {showHrrrm && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: isHero ? '-14px' : '-20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#FFE4B5',
              color: '#00323F',
              border: '2px solid #00323F',
              borderRadius: '9999px',
              padding: '2px 10px',
              fontFamily: "'Nunito', sans-serif",
              fontSize: '12px',
              fontWeight: 800,
              whiteSpace: 'nowrap',
              boxShadow: '2px 2px 0 #00323F',
              animation: 'popIn 200ms var(--ease-spring, ease) forwards',
              zIndex: 20,
              pointerEvents: 'none',
            }}
          >
            Hrrrm... zzz
          </div>
        )}
        <img
          src={snorlaxSleepingPng}
          alt={alt || "Sleeping Snorlax"}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            filter: 'drop-shadow(0px 8px 16px rgba(0, 0, 0, 0.16))',
          }}
        />

        {/* Floating SVG Z glyphs for hero and large sizes */}
        {(isHero || isLg) && (
          <>
            <svg
              className="floating-z-1"
              aria-hidden="true"
              viewBox="0 0 120 100"
              style={{
                position: 'absolute',
                top: isHero ? '10%' : '2%',
                left: isHero ? '34%' : '28%',
                width: isHero ? '26px' : '16px',
                height: isHero ? '22px' : '14px',
                pointerEvents: 'none',
                overflow: 'visible',
              }}
            >
              <path
                d="M 18,18 L 98,38 L 16,84 L 96,96"
                fill="none"
                stroke="var(--snorlax-outline, #00323F)"
                strokeWidth="24"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <svg
              className="floating-z-2"
              aria-hidden="true"
              viewBox="0 0 120 100"
              style={{
                position: 'absolute',
                top: isHero ? '2%' : '-6%',
                left: isHero ? '24%' : '18%',
                width: isHero ? '20px' : '13px',
                height: isHero ? '17px' : '11px',
                pointerEvents: 'none',
                overflow: 'visible',
              }}
            >
              <path
                d="M 18,18 L 98,38 L 16,84 L 96,96"
                fill="none"
                stroke="var(--snorlax-outline, #00323F)"
                strokeWidth="24"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </>
        )}
      </div>
    );
  }

  // 3. ONE-EYE CRACKED OPEN (Mood: 1-2 urgent items, sleepy-grumpy)
  if (pose === 'one-eye') {
    return (
      <svg
        width={px}
        height={px}
        viewBox="0 0 120 120"
        xmlns="http://www.w3.org/2000/svg"
        className={`${className} ${bouncing ? 'belly-clicked' : ''}`}
        onClick={handleBellyClick}
        style={{ display: 'inline-block', overflow: 'visible', cursor: 'pointer', ...style }}
        aria-label={alt || "Snorlax with one eye cracked open"}
      >
        {/* Ears */}
        <polygon points="26,38 34,14 46,32" fill="#00627A" stroke="#00323F" strokeWidth="3" strokeLinejoin="round" />
        <polygon points="94,38 86,14 74,32" fill="#00627A" stroke="#00323F" strokeWidth="3" strokeLinejoin="round" />

        {/* Body & Cream Belly */}
        <ellipse cx="60" cy="74" rx="46" ry="36" fill="#00627A" stroke="#00323F" strokeWidth="3" />
        <ellipse cx="60" cy="76" rx="34" ry="26" fill="#FFE4B5" stroke="#00323F" strokeWidth="2.5" />

        {/* Feet with peach pads */}
        <ellipse cx="28" cy="104" rx="14" ry="8" fill="#FFE4B5" stroke="#00323F" strokeWidth="2.5" />
        <ellipse cx="28" cy="104" rx="8" ry="4" fill="#F9C98F" />
        <ellipse cx="92" cy="104" rx="14" ry="8" fill="#FFE4B5" stroke="#00323F" strokeWidth="2.5" />
        <ellipse cx="92" cy="104" rx="8" ry="4" fill="#F9C98F" />

        {/* Head */}
        <circle cx="60" cy="44" r="28" fill="#00627A" stroke="#00323F" strokeWidth="3" />
        <path
          d="M 40,36 C 42,28 50,26 60,26 C 70,26 78,28 80,36 C 82,46 76,58 60,58 C 44,58 38,46 40,36 Z"
          fill="#FFE4B5"
          stroke="#00323F"
          strokeWidth="2"
        />

        {/* Left eye: Still closed curve */}
        <path d="M 46,40 Q 51,44 56,40" fill="none" stroke="#00323F" strokeWidth="2.5" strokeLinecap="round" />

        {/* Right eye: One eye cracked open peering out */}
        <ellipse cx="70" cy="40" rx="4" ry="2.5" fill="#00323F" />
        <circle cx="70.5" cy="39.5" r="1.2" fill="#FFFFFF" />

        {/* Nose */}
        <ellipse cx="60" cy="45" rx="1.5" ry="1" fill="#00323F" />

        {/* Slightly grumpy half-smirk */}
        <path d="M 54,49 Q 60,51 66,48" fill="none" stroke="#00323F" strokeWidth="2" strokeLinecap="round" />
        <polygon points="53,49 55,49 54,52" fill="#FFFFFF" stroke="#00323F" strokeWidth="0.8" />

        {/* One arm scratching head, other on belly */}
        <ellipse cx="20" cy="46" rx="10" ry="7" transform="rotate(-35 20 46)" fill="#00627A" stroke="#00323F" strokeWidth="2.5" />
        <ellipse cx="96" cy="62" rx="11" ry="8" transform="rotate(-20 96 62)" fill="#00627A" stroke="#00323F" strokeWidth="2.5" />
      </svg>
    );
  }

  // 4. AWAKE POSE (Mood: 3+ urgent alarms, arms raised)
  if (pose === 'awake') {
    return (
      <svg
        width={px}
        height={px}
        viewBox="0 0 120 120"
        xmlns="http://www.w3.org/2000/svg"
        className={`${className} ${bouncing ? 'belly-clicked' : ''}`}
        onClick={handleBellyClick}
        style={{ display: 'inline-block', overflow: 'visible', cursor: 'pointer', ...style }}
        aria-label={alt || "Awake Snorlax"}
      >
        {/* Ears */}
        <polygon points="26,38 34,14 46,32" fill="#00627A" stroke="#00323F" strokeWidth="3" strokeLinejoin="round" />
        <polygon points="94,38 86,14 74,32" fill="#00627A" stroke="#00323F" strokeWidth="3" strokeLinejoin="round" />

        {/* Body & Cream Belly */}
        <ellipse cx="60" cy="74" rx="46" ry="36" fill="#00627A" stroke="#00323F" strokeWidth="3" />
        <ellipse cx="60" cy="76" rx="34" ry="26" fill="#FFE4B5" stroke="#00323F" strokeWidth="2.5" />

        {/* Feet with peach pads */}
        <ellipse cx="28" cy="104" rx="14" ry="8" fill="#FFE4B5" stroke="#00323F" strokeWidth="2.5" />
        <ellipse cx="28" cy="104" rx="8" ry="4" fill="#F9C98F" />
        <ellipse cx="92" cy="104" rx="14" ry="8" fill="#FFE4B5" stroke="#00323F" strokeWidth="2.5" />
        <ellipse cx="92" cy="104" rx="8" ry="4" fill="#F9C98F" />

        {/* Head */}
        <circle cx="60" cy="44" r="28" fill="#00627A" stroke="#00323F" strokeWidth="3" />
        <path
          d="M 40,36 C 42,28 50,26 60,26 C 70,26 78,28 80,36 C 82,46 76,58 60,58 C 44,58 38,46 40,36 Z"
          fill="#FFE4B5"
          stroke="#00323F"
          strokeWidth="2"
        />

        {/* Awake Wide Eyes */}
        <circle cx="50" cy="40" r="3.5" fill="#00323F" />
        <circle cx="51" cy="39" r="1.2" fill="#FFFFFF" />
        <circle cx="70" cy="40" r="3.5" fill="#00323F" />
        <circle cx="71" cy="39" r="1.2" fill="#FFFFFF" />

        {/* Mouth open */}
        <ellipse cx="60" cy="49" rx="4" ry="3" fill="#D83C2D" stroke="#00323F" strokeWidth="1.5" />
        <polygon points="57,48 58,46 59,48" fill="#FFFFFF" />
        <polygon points="61,48 62,46 63,48" fill="#FFFFFF" />

        {/* Arms raised */}
        <ellipse cx="18" cy="48" rx="12" ry="7" transform="rotate(-30 18 48)" fill="#00627A" stroke="#00323F" strokeWidth="2.5" />
        <ellipse cx="102" cy="48" rx="12" ry="7" transform="rotate(30 102 48)" fill="#00627A" stroke="#00323F" strokeWidth="2.5" />
      </svg>
    );
  }

  // 5. EATING POSE (Color-graded Snorlax eating donuts, matching theme palette)
  if (pose === 'eating') {
    const width = Math.round(px * 1.35);
    const height = px;
    return (
      <div
        className={`snorlax-eating-mascot ${className} ${bouncing ? 'belly-clicked' : ''}`}
        onClick={handleBellyClick}
        title="Munch! Snorlax eating donuts."
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: `${width}px`,
          height: `${height}px`,
          minWidth: `${width}px`,
          minHeight: `${height}px`,
          position: 'relative',
          cursor: 'pointer',
          userSelect: 'none',
          overflow: 'visible',
          ...style,
        }}
      >
        <img
          src={snorlaxEatingPng}
          alt={alt || "Snorlax eating donuts"}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            filter: 'drop-shadow(0px 4px 10px rgba(0, 0, 0, 0.12))',
          }}
        />
      </div>
    );
  }

  // 6. BLOCKING POSE (Route 12 Blocked by Sleeping Snorlax)
  if (pose === 'blocking') {
    const width = `${px * 1.3}px`;
    const height = `${px * 1.15}px`;
    return (
      <div
        className={`snorlax-blocking-mascot ${className} ${bouncing ? 'belly-clicked' : ''}`}
        onClick={handleBellyClick}
        title="Route 12 is blocked! Snorlax fell asleep across the road."
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width,
          height,
          minWidth: width,
          minHeight: height,
          cursor: 'pointer',
          userSelect: 'none',
          ...style,
        }}
      >
        <img
          src={snorlaxBlockingPng}
          alt={alt || "Route 12 Blocked by Snorlax"}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            filter: 'drop-shadow(0px 6px 14px rgba(0, 50, 63, 0.18))',
          }}
        />
      </div>
    );
  }

  // 7. MUNCHLAX POSE (Small sleeping Munchlax)
  if (pose === 'munchlax') {
    return (
      <svg
        width={px}
        height={px}
        viewBox="0 0 80 80"
        xmlns="http://www.w3.org/2000/svg"
        className={`${className} munchlax-breathe ${bouncing ? 'belly-clicked' : ''}`}
        onClick={handleBellyClick}
        style={{ display: 'inline-block', overflow: 'visible', cursor: 'pointer', ...style }}
        aria-label={alt || "Sleeping Munchlax"}
      >
        {/* Pointy ears */}
        <polygon points="16,28 20,6 28,24" fill="#004F60" stroke="#00323F" strokeWidth="2.5" strokeLinejoin="round" />
        <polygon points="64,28 60,6 52,24" fill="#004F60" stroke="#00323F" strokeWidth="2.5" strokeLinejoin="round" />
        <polygon points="20,24 22,12 26,22" fill="#FFE4B5" opacity="0.4" />
        <polygon points="60,24 58,12 54,22" fill="#FFE4B5" opacity="0.4" />

        {/* Round body & cream belly bib */}
        <ellipse cx="40" cy="54" rx="28" ry="24" fill="#004F60" stroke="#00323F" strokeWidth="2.5" />
        <ellipse cx="40" cy="56" rx="20" ry="17" fill="#FFE4B5" stroke="#00323F" strokeWidth="2" />

        {/* Head & face cream patch */}
        <circle cx="40" cy="32" r="18" fill="#004F60" stroke="#00323F" strokeWidth="2.5" />
        <ellipse cx="40" cy="34" rx="13" ry="10" fill="#FFE4B5" stroke="#00323F" strokeWidth="1.5" />

        {/* Peaceful sleeping curved eyes (closed happy arcs) */}
        <path d="M 30,31 Q 34,35 38,31" fill="none" stroke="#00323F" strokeWidth="2" strokeLinecap="round" />
        <path d="M 42,31 Q 46,35 50,31" fill="none" stroke="#00323F" strokeWidth="2" strokeLinecap="round" />

        {/* Sweet sleepy mouth */}
        <path d="M 37,37 Q 40,40 43,37" fill="none" stroke="#00323F" strokeWidth="1.5" strokeLinecap="round" />

        {/* Tiny paws resting on belly */}
        <ellipse cx="30" cy="52" rx="6" ry="4" transform="rotate(15 30 52)" fill="#004F60" stroke="#00323F" strokeWidth="1.5" />
        <ellipse cx="50" cy="52" rx="6" ry="4" transform="rotate(-15 50 52)" fill="#004F60" stroke="#00323F" strokeWidth="1.5" />

        {/* Feet with peach pads tucked comfortably */}
        <ellipse cx="27" cy="72" rx="9" ry="6" fill="#FFE4B5" stroke="#00323F" strokeWidth="2" />
        <ellipse cx="27" cy="72" rx="5" ry="3" fill="#F9C98F" />
        <ellipse cx="53" cy="72" rx="9" ry="6" fill="#FFE4B5" stroke="#00323F" strokeWidth="2" />
        <ellipse cx="53" cy="72" rx="5" ry="3" fill="#F9C98F" />

        {/* Tiny sleeping Z floating above ear (every 4s) */}
        <path
          className="munchlax-zzz"
          d="M 58,12 L 64,14 L 57,19 L 63,20"
          stroke="#00323F"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.85"
        />
      </svg>
    );
  }

  // 8. BELLY POSE (Reclined Snorlax, prominent cream belly)
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 120 100"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} snorlax-breathe ${bouncing ? 'belly-clicked' : ''}`}
      onClick={handleBellyClick}
      style={{ display: 'inline-block', overflow: 'visible', cursor: 'pointer', ...style }}
      aria-label={alt || "Snorlax Belly"}
    >
      <ellipse cx="60" cy="55" rx="52" ry="38" fill="#00627A" stroke="#00323F" strokeWidth="3" />
      <ellipse cx="60" cy="58" rx="42" ry="30" fill="#FFE4B5" stroke="#00323F" strokeWidth="3" />

      {/* Tiny berry crumbs on belly if allDone */}
      {crumbs && (
        <g fill="#D83C2D" opacity="0.8">
          <circle cx="56" cy="54" r="1.5" />
          <circle cx="62" cy="58" r="2" />
          <circle cx="68" cy="52" r="1.2" />
          <circle cx="52" cy="62" r="1" fill="#FFE4B5" stroke="#00323F" strokeWidth="0.5" />
        </g>
      )}

      <circle cx="60" cy="24" r="18" fill="#00627A" stroke="#00323F" strokeWidth="2.5" />
      <polygon points="45,18 42,6 52,14" fill="#00627A" stroke="#00323F" strokeWidth="2" />
      <polygon points="75,18 78,6 68,14" fill="#00627A" stroke="#00323F" strokeWidth="2" />
      <ellipse cx="60" cy="25" rx="12" ry="8" fill="#FFE4B5" stroke="#00323F" strokeWidth="1.5" />
      <path d="M 52,24 Q 55,27 58,24" fill="none" stroke="#00323F" strokeWidth="2" strokeLinecap="round" />
      <path d="M 62,24 Q 65,27 68,24" fill="none" stroke="#00323F" strokeWidth="2" strokeLinecap="round" />

      <ellipse cx="44" cy="52" rx="7" ry="5" fill="#00627A" stroke="#00323F" strokeWidth="2" />
      <ellipse cx="76" cy="52" rx="7" ry="5" fill="#00627A" stroke="#00323F" strokeWidth="2" />

      <ellipse cx="24" cy="82" rx="12" ry="7" fill="#FFE4B5" stroke="#00323F" strokeWidth="2" />
      <ellipse cx="24" cy="82" rx="7" ry="4" fill="#F9C98F" />
      <ellipse cx="96" cy="82" rx="12" ry="7" fill="#FFE4B5" stroke="#00323F" strokeWidth="2" />
      <ellipse cx="96" cy="82" rx="7" ry="4" fill="#F9C98F" />
    </svg>
  );
};
