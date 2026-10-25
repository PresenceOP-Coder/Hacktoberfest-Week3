import React from 'react';
import { Mascot } from './Mascot';

interface SnorlaxProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const SnorlaxSleeping: React.FC<SnorlaxProps> = ({ size = 96, className, style }) => {
  const mascotSize = size >= 140 ? 'hero' : size >= 70 ? 'lg' : size >= 45 ? 'md' : 'sm';
  return <Mascot pose="sleeping" size={mascotSize} className={className} style={{ width: size, height: size, ...style }} />;
};

export const SnorlaxAwake: React.FC<SnorlaxProps> = ({ size = 96, className, style }) => {
  const mascotSize = size >= 70 ? 'lg' : size >= 45 ? 'md' : 'sm';
  return <Mascot pose="awake" size={mascotSize} className={className} style={{ width: size, height: size, ...style }} />;
};

export const SnorlaxEating: React.FC<SnorlaxProps> = ({ size = 96, className, style }) => {
  const mascotSize = size >= 70 ? 'lg' : size >= 45 ? 'md' : 'sm';
  return <Mascot pose="eating" size={mascotSize} className={className} style={{ width: size, height: size, ...style }} />;
};

export const SnorlaxBlocking: React.FC<SnorlaxProps> = ({ size = 110, className, style }) => {
  const mascotSize = size >= 80 ? 'lg' : 'md';
  return <Mascot pose="blocking" size={mascotSize} className={className} style={{ width: size, height: size * 0.85, ...style }} />;
};

export const Munchlax: React.FC<SnorlaxProps> = ({ size = 64, className, style }) => {
  const mascotSize = size >= 50 ? 'md' : 'sm';
  return <Mascot pose="munchlax" size={mascotSize} className={className} style={{ width: size, height: size, ...style }} />;
};
