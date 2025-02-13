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

const AddTextIcon = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <g fill="#212121">
    <path d="M17.5,12 C20.5375661,12 23,14.4624339 23,17.5 C23,20.5375661 20.5375661,23 17.5,23 C14.4624339,23 12,20.5375661 12,17.5 C12,14.4624339 14.4624339,12 17.5,12 Z M17.5,13.9992349 L17.4101244,14.0072906 C17.2060313,14.0443345 17.0450996,14.2052662 17.0080557,14.4093593 L17,14.4992349 L16.9996498,16.9992349 L14.4976498,17 L14.4077742,17.0080557 C14.2036811,17.0450996 14.0427494,17.2060313 14.0057055,17.4101244 L13.9976498,17.5 L14.0057055,17.5898756 C14.0427494,17.7939687 14.2036811,17.9549004 14.4077742,17.9919443 L14.4976498,18 L17.0006498,17.9992349 L17.0011076,20.5034847 L17.0091633,20.5933603 C17.0462073,20.7974534 17.207139,20.9583851 17.411232,20.995429 L17.5011076,21.0034847 L17.5909833,20.995429 C17.7950763,20.9583851 17.956008,20.7974534 17.993052,20.5933603 L18.0011076,20.5034847 L18.0006498,17.9992349 L20.5045655,18 L20.5944411,17.9919443 C20.7985342,17.9549004 20.9594659,17.7939687 20.9965098,17.5898756 L21.0045655,17.5 L20.9965098,17.4101244 C20.9594659,17.2060313 20.7985342,17.0450996 20.5944411,17.0080557 L20.5045655,17 L17.9996498,16.9992349 L18,14.4992349 L17.9919443,14.4093593 C17.9496084,14.1761101 17.7454599,13.9992349 17.5,13.9992349 Z M16.25,3.5 C16.6296958,3.5 16.943491,3.78215388 16.9931534,4.14822944 L17,4.25 L17,6.25 C17,6.66421356 16.6642136,7 16.25,7 C15.8703042,7 15.556509,6.71784612 15.5068466,6.35177056 L15.5,6.25 L15.5,6 L10.75,6 L10.75,19.5 L11.3136354,19.5004209 C11.4858618,20.0334296 11.7250589,20.53633 12.0213079,20.9992033 L12,21 L8,21 C7.58578644,21 7.25,20.6642136 7.25,20.25 C7.25,19.8703042 7.53215388,19.556509 7.89822944,19.5068466 L8,19.5 L9.25,19.5 L9.25,6 L4.5,6 L4.5,6.25 C4.5,6.62969577 4.21784612,6.94349096 3.85177056,6.99315338 L3.75,7 C3.37030423,7 3.05650904,6.71784612 3.00684662,6.35177056 L3,6.25 L3,4.25 C3,3.83578644 3.33578644,3.5 3.75,3.5 C4.12969577,3.5 4.44349096,3.78215388 4.49315338,4.14822944 L4.5,4.25 L4.5,4.5 L15.5,4.5 L15.5,4.25 C15.5,3.87030423 15.7821539,3.55650904 16.1482294,3.50684662 L16.25,3.5 Z" />
  </g>
</svg>

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
  AddTextIcon,
  PolymerShapes
};
