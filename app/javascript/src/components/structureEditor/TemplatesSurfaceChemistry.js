import React from 'react';

function BodyRectangleIcon() {
  return (
    <svg
      width="50"
      height="50"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
    >
      <defs>
        <radialGradient id="grad1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" style={{ stopColor: 'rgb(255,255,255)', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: 'rgb(0,0,0)', stopOpacity: 1 }} />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="40" fill="url(#grad1)" />
    </svg>
  );
}

function MultiHatched() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="50"
      height="50"
      viewBox="0 0 300 300"
    >
      <rect
        width="300"
        height="150"
        y="80"
        stroke="#ba8c00"
        strokeWidth="15"
        fill="#fff"
      />
    </svg>
  );
}

function NotFound() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="50"
      height="50"
      viewBox="0 0 300 300"
    >
      <rect
        width="300"
        height="150"
        y="80"
        stroke="#ba8c00"
        strokeWidth="10"
        fill="#fff"
      />
    </svg>
  );
}

function PhaseSeparatedSupportSolidDivided() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="50"
      height="30"
      viewBox="0 0 120 100"
    >
      <rect
        width="120"
        height="40"
        y="35"
        rx="5"
        ry="5"
        stroke="#000"
        strokeWidth="10"
        fill="ActivePhaseFullCoating"
      />
    </svg>
  );
}

function PorousHatched() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="50"
      height="50"
      viewBox="0 0 300 300"
    >
      <rect
        width="300"
        height="150"
        y="80"
        stroke="#ba8c00"
        strokeWidth="10"
        fill="#fff"
      />
    </svg>
  );
}

function Promotors() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="50"
      height="50"
      viewBox="0 0 300 300"
    >
      <rect
        width="300"
        height="150"
        y="80"
        stroke="#ba8c00"
        strokeWidth="10"
        fill="#fff"
      />
    </svg>
  );
}

function ActivePhaseAlloy() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="50"
      height="50"
      viewBox="0 0 100 100"
    >
      <circle r="40" cx="50" cy="50" stroke="#4472c4" strokeWidth="5" fill="#d8e2f3" />
    </svg>
  );
}

function ActivePhasePromotors() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="50"
      height="50"
      viewBox="0 0 100 100"
    >
      <circle r="30" cx="50" cy="50" stroke="#ac5b23" strokeWidth="3" fill="#ed7d31" />
    </svg>
  );
}

function ActivePhaseFullCoating() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="50"
      height="50"
      viewBox="0 0 100 100"
    >
      <circle r="40" cx="50" cy="50" stroke="#31538f" strokeWidth="5" fill="#4472c4" />
    </svg>
  );
}

function BodySolid() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="50"
      height="50"
      viewBox="0 0 350 350"
    >
      <rect
        width="350"
        height="120"
        y="120"
        rx="20"
        ry="20"
        stroke="#000"
        strokeWidth="10"
        fill="ActivePhaseFullCoating"
      />
    </svg>
  );
}

const PolymerShapes = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <!-- Square with border -->
  <rect x="4" y="4" width="8" height="8" stroke="black" stroke-width="2" fill="none" />
  
  <!-- Circle with border -->
  <circle cx="18" cy="18" r="4" stroke="black" stroke-width="2" fill="none" />
</svg>
`;

export {
  BodyRectangleIcon,
  MultiHatched,
  NotFound,
  PhaseSeparatedSupportSolidDivided,
  PorousHatched,
  ActivePhasePromotors,
  PolymerShapes,
  BodySolid,
  ActivePhaseAlloy,
  ActivePhaseFullCoating
};
