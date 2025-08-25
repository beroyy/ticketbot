import React from "react";
import Image from "next/image";

interface EmojiProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

export const EmojiProgressIcon = ({
  percentage,
  size = 120,
  strokeWidth = 8,
}: EmojiProgressProps) => {
  // Determine color based on percentage
  const getColorByPercentage = (percentage: number): string => {
    if (percentage >= 0 && percentage < 25) return "#FF856D";
    if (percentage >= 25 && percentage < 50) return "#F6B51E";
    if (percentage >= 50 && percentage < 75) return "#B47BFF";
    return "#00CA72";
  };

  const color = getColorByPercentage(percentage);

  // Calculate the circle parameters
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  // Counter-clockwise progress: start from full circumference and reduce
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Center point
  const center = size / 2;

  // Emoji size (roughly 50% of the circle size for less spacing)
  const emojiSize = size * 0.6;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="rotate-90 transform"
        viewBox={`0 0 ${size.toString()} ${size.toString()}`}
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          className="opacity-20"
        />

        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-in-out"
        />
      </svg>

      {/* Emoji in the center */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          width: size,
          height: size,
        }}
      >
        <div
          className="relative flex items-center justify-center"
          style={{
            width: emojiSize,
            height: emojiSize,
          }}
        >
          {/* Colored emoji base */}
          <div
            style={{
              width: emojiSize * 0.8,
              height: emojiSize * 0.8,
              backgroundColor: color,
              mask: "url(/8bit-emoji.svg) center/contain no-repeat",
              WebkitMask: "url(/8bit-emoji.svg) center/contain no-repeat",
            }}
          />

          {/* Original emoji overlay for dark features */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="/8bit-emoji.svg"
              alt="8-bit smile emoji"
              width={emojiSize * 0.8}
              height={emojiSize * 0.8}
              className="object-contain"
              style={{
                mixBlendMode: "multiply",
                opacity: 0.8,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
