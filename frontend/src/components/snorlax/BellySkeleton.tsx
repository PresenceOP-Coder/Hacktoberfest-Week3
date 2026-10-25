import React from 'react';

interface BellySkeletonProps {
  message?: string;
  submessage?: string;
}

export const BellySkeleton: React.FC<BellySkeletonProps> = ({
  message = 'Snorlax is yawning...',
  submessage = 'Reading your mail slowly, on purpose.',
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 24px',
        textAlign: 'center',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      {/* Snorlax Belly Shaped Skeleton */}
      <div
        className="belly-skeleton"
        style={{
          width: '120px',
          height: '90px',
          background: 'var(--belly)',
          border: '3px solid var(--snorlax-outline)',
          borderRadius: '50% 50% 45% 45% / 60% 60% 40% 40%',
          boxShadow: 'var(--shadow-chunky)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Soft belly texture curve */}
        <div
          style={{
            width: '80px',
            height: '55px',
            borderRadius: '50%',
            background: 'var(--belly-dark)',
            opacity: 0.35,
          }}
        />
        {/* Sleeping "zzz" */}
        <span
          style={{
            position: 'absolute',
            top: '-16px',
            right: '-10px',
            fontFamily: 'var(--font-logo)',
            fontSize: '14px',
            color: 'var(--snorlax-teal)',
            fontWeight: 800,
          }}
        >
          z
        </span>
        <span
          style={{
            position: 'absolute',
            top: '-26px',
            right: '2px',
            fontFamily: 'var(--font-logo)',
            fontSize: '18px',
            color: 'var(--snorlax-teal)',
            fontWeight: 800,
          }}
        >
          Z
        </span>
      </div>

      <h3
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '20px',
          fontWeight: 800,
          color: 'var(--ink)',
          marginBottom: '6px',
        }}
      >
        {message}
      </h3>

      {submessage && (
        <p
          style={{
            fontSize: '15px',
            color: 'var(--muted)',
            maxWidth: '440px',
            lineHeight: 1.5,
          }}
        >
          {submessage}
        </p>
      )}
    </div>
  );
};
