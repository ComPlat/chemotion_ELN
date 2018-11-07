import React from 'react';
import PropTypes from 'prop-types';

import SvgFileZoomPan from 'react-svg-file-zoom-pan';
import PngFileZoomPan from './PreviewFileZoomPan';

export default class PreviewFileZoomPan extends React.PureComponent {
  constructor() {
    super();

    this.setPreviewRef = (el) => {
      this.previewDiv = el;
    };

    this.isSvg = true;
    this.centeringImage = this.centeringImage.bind(this);
  }

  componentDidMount() {
    setTimeout(this.centeringImage, 1000);
  }

  componentDidUpdate() {
    setTimeout(this.centeringImage, 1000);
  }

  centeringImage() {
    const svgEl = this.previewDiv.querySelector('#svg-file-container');
    const imgSelector = this.isSvg ? 'g > svg' : '#png-img-svg';
    const imgEl = svgEl.querySelector(imgSelector);
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
    const { image } = this.props;
    if (!image) return <span />;

    let svg = image;
    if (image.startsWith('data:image/png;base64')) {
      this.isSvg = false;
      svg = `
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <image id="png-img-svg" xlink:href="${image}"/>
        </svg>
      `;
    }

    return (
      <div ref={this.setPreviewRef}>
        <SvgFileZoomPan svg={svg} duration={200} />
      </div>
    );
  }
}

PreviewFileZoomPan.propTypes = {
  image: PropTypes.string
};

PreviewFileZoomPan.defaultProps = {
  image: ""
};
