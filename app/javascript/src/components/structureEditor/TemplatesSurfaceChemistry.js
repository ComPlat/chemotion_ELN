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
        strokeWidth="3"
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

function Support() {
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
        rx="1"
        ry="1"
        stroke="#4472c4"
        strokeWidth="3"
        fill="#d8e2f3"
        strokeDasharray="10,7"
      />
    </svg>
  );
}

function SupportSinglePhase() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="50"
      height="30"
      viewBox="0 0 120 100"
    >
      <rect
        width="112"
        height="40"
        y="37"
        x="2"
        stroke="#ba8c00"
        fill="#ffc000"
        strokeWidth="4"
      />
    </svg>
  );
}

function SupportSinglePhaseWhite() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="50"
      height="30"
      viewBox="0 0 120 100"
    >
      <rect
        width="112"
        height="40"
        y="37"
        x="2"
        stroke="#ba8c00"
        fill="#fff"
        strokeWidth="4"
      />
    </svg>
  );
}

function BodySolid() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="50"
      height="30"
      viewBox="0 0 120 100"
    >
      <rect
        width="112"
        height="40"
        y="37"
        x="2"
        stroke="#000"
        fill="#757070"
        strokeWidth="4"
      />
    </svg>
  );
}

function BodySolidWhite() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="50"
      height="30"
      viewBox="0 0 120 100"
    >
      <rect
        width="112"
        height="40"
        y="37"
        x="2"
        rx="5"
        ry="5"
        stroke="#000"
        fill="#fff"
        strokeWidth="4"
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

const RescaleCanvas = `
<?xml version="1.0" encoding="utf-8"?><!-- Uploaded to: SVG Repo, www.svgrepo.com, Generator: SVG Repo Mixer Tools -->
<svg fill="#000000" width="20px" height="20px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M1,12A11,11,0,0,1,17.882,2.7l1.411-1.41A1,1,0,0,1,21,2V6a1,1,0,0,1-1,1H16a1,1,0,0,1-.707-1.707l1.128-1.128A8.994,8.994,0,0,0,3,12a1,1,0,0,1-2,0Zm21-1a1,1,0,0,0-1,1,9.01,9.01,0,0,1-9,9,8.9,8.9,0,0,1-4.42-1.166l1.127-1.127A1,1,0,0,0,8,17H4a1,1,0,0,0-1,1v4a1,1,0,0,0,.617.924A.987.987,0,0,0,4,23a1,1,0,0,0,.707-.293L6.118,21.3A10.891,10.891,0,0,0,12,23,11.013,11.013,0,0,0,23,12,1,1,0,0,0,22,11Z"/></svg>
`;

export {
  BodyRectangleIcon,
  MultiHatched,
  NotFound,
  PhaseSeparatedSupportSolidDivided,
  PorousHatched,
  ActivePhasePromotors,
  BodySolid,
  ActivePhaseAlloy,
  ActivePhaseFullCoating,
  Support,
  SupportSinglePhase,
  SupportSinglePhaseWhite,
  BodySolidWhite,
  PolymerShapes,
  RescaleCanvas
};
