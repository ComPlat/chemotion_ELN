import React from 'react';
import PropTypes from 'prop-types';

import SvgFileZoomPan from 'react-svg-file-zoom-pan';

export default class PngFileZoomPan extends React.PureComponent {
  constructor() {
    super();

    this.setSvgRef = (el) => {
      this.svgDiv = el;
    };

    this.centeringImage = this.centeringImage.bind(this);
  }

  componentDidMount() {
    setTimeout(this.centeringImage, 1000);
  }

  componentDidUpdate() {
    setTimeout(this.centeringImage, 1000);
  }

  centeringImage() {
    const svgEl = this.svgDiv.querySelector('#svg-file-container');
    const imgEl = svgEl.querySelector('#png-img-svg');
    const svgWidth = Math.floor(svgEl.getBoundingClientRect().width);
    const imgWidth = Math.floor(imgEl.getBoundingClientRect().width);

    if (svgWidth > imgWidth) {
      const xOffset = `${(svgWidth - imgWidth) / 2}`;
      imgEl.setAttribute('x', xOffset);
    } else {
      imgEl.setAttribute('width', svgWidth);
    }

    const imgHeight = Math.floor(imgEl.getBoundingClientRect().height);
    svgEl.style.height = `${Math.floor(imgHeight) + 5}px`;
  }

  render() {
    const { png } = this.props;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <image id="png-img-svg" xlink:href="${png}"/>
      </svg>
    `;

    return (
      <div ref={this.setSvgRef}>
        <SvgFileZoomPan svg={svg} duration={200} />
      </div>
    );
  }
}

PngFileZoomPan.propTypes = {
  png: PropTypes.string.isRequired
};
