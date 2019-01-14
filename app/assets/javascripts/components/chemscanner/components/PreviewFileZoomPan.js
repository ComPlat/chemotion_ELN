import React from 'react';
import PropTypes from 'prop-types';

import SvgFileZoomPan from 'react-svg-file-zoom-pan';

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
    setTimeout(this.centeringImage, 200);
  }

  componentDidUpdate() {
    setTimeout(this.centeringImage, 200);
  }

  centeringImage() {
    const svgEl = this.previewDiv.querySelector('#svg-file-container');
    const imgSelector = this.isSvg ? 'g > svg' : '#png-img-svg';
    const imgEl = svgEl.querySelector(imgSelector);
    const svgWidth = Math.floor(svgEl.getBoundingClientRect().width);

    let imgWidth;
    let imgHeight;
    if (this.isSvg) {
      imgWidth = Math.floor(imgEl.getBoundingClientRect().width);
      imgHeight = Math.floor(imgEl.getBoundingClientRect().height);
      svgEl.setAttribute('viewBox', `0 0 ${imgWidth} ${imgHeight}`);
      svgEl.setAttribute('height', '300px');
      return;
    }
    const dummyImg = this.previewDiv.querySelector('#dummy-img');
    dummyImg.style.display = 'block';
    imgWidth = window.getComputedStyle(dummyImg).getPropertyValue('width');
    imgHeight = window.getComputedStyle(dummyImg).getPropertyValue('height');
    dummyImg.style.display = 'none';

    if (svgWidth > imgWidth) {
      const xOffset = `${(svgWidth - imgWidth) / 2}`;
      imgEl.setAttribute('x', xOffset);
    } else {
      imgEl.setAttribute('width', svgWidth);
    }

    imgEl.setAttribute('height', imgHeight);
    svgEl.style.height = `${imgHeight}`;
  }

  render() {
    const { content, duration } = this.props;
    if (!content) return <span />;

    let svg = content;
    if (content.startsWith('data:image/png;base64')) {
      this.isSvg = false;
      svg = `
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <image id="png-img-svg" xlink:href="${content}" width="100%" height="100%" />
        </svg>
      `;
    } else {
      svg = content;
    }

    let dummyImg = (<span />);
    if (!this.isSvg) {
      dummyImg = (<img id="dummy-img" alt="" src={content} />);
    }

    return (
      <div
        ref={this.setPreviewRef}
        style={{
          position: 'sticky',
          top: '44px',
          zIndex: 2,
          background: 'white',
        }}
      >
        {dummyImg}
        <SvgFileZoomPan svg={svg} duration={duration} />
      </div>
    );
  }
}

PreviewFileZoomPan.propTypes = {
  content: PropTypes.string,
  duration: PropTypes.number,
};

PreviewFileZoomPan.defaultProps = {
  content: '',
  duration: 200,
};
