import React from 'react';

interface BentoBrandMarkProps {
  size?: number;
  className?: string;
}

export const BentoBrandMark: React.FC<BentoBrandMarkProps> = ({ size = 36, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="120" height="120" rx="28" fill="#0F191F" />
      {/* Top-left Emerald Rupee tile */}
      <path d="M26 38C26 29.1634 33.1634 22 42 22H58V52H26V38Z" fill="#0E9F8B" />
      <text
        x="42"
        y="43"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="18"
        fontWeight="700"
        fontFamily="Plus Jakarta Sans, sans-serif"
      >
        ₹
      </text>
      {/* Top-right Amber Check tile */}
      <path d="M62 22H72C84.1503 22 94 31.8497 94 44C94 48.4183 90.4183 52 86 52H62V22Z" fill="#F59E28" />
      <circle cx="77" cy="37" r="8" stroke="#FFFFFF" strokeWidth="2.2" />
      <path d="M73.5 37L76 39.5L81 34.5" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Mid-left Violet Calendar tile */}
      <rect x="26" y="56" width="32" height="26" rx="4" fill="#5D518C" />
      <rect x="35" y="62" width="14" height="13" rx="2" stroke="#FFFFFF" strokeWidth="2" />
      <path d="M35 66.5H49" stroke="#FFFFFF" strokeWidth="1.8" />

      {/* Mid-right Coral Target tile */}
      <path d="M62 56H86C92.6274 56 98 61.3726 98 68V70C98 76.6274 92.6274 82 86 82H62V56Z" fill="#DE4C6B" />
      <circle cx="79" cy="69" r="7.5" stroke="#FFFFFF" strokeWidth="2" />
      <circle cx="79" cy="69" r="2.8" fill="#FFFFFF" />

      {/* Bottom Ocean Analytics tile */}
      <rect x="26" y="86" width="66" height="16" rx="8" fill="#2B6B84" />
      <rect x="49" y="94" width="4" height="5" rx="1" fill="#FFFFFF" />
      <rect x="57" y="91" width="4" height="8" rx="1" fill="#FFFFFF" />
      <rect x="65" y="89" width="4" height="10" rx="1" fill="#FFFFFF" />
    </svg>
  );
};
