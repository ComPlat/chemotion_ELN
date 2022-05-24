import React from 'react';
import PropTypes from 'prop-types';

import SvgFileZoomPan from 'react-svg-file-zoom-pan';

const optimizeHeight = (imgWidth, imgHeight) => {
  if (imgHeight < 300) return `${imgHeight}px`;

  return imgWidth > imgHeight ? '300px' : '400px';
};

export default class PreviewFileZoomPan extends React.PureComponent {
  constructor() {
    super();

    this.state = {
      type: '',
      imageContent: ''
    };

    this.setPreviewRef = (el) => {
      this.previewDiv = el;
    };

    this.isSvg = true;
    this.centeringImage = this.centeringImage.bind(this);
    this.displayURL = this.displayURL.bind(this);
  }

  componentDidMount() {
    // setTimeout(this.centeringImage, 300);

    const { imageURL } = this.props;
    this.displayURL(imageURL);
  }

  componentWillReceiveProps(newProps) {
    const { imageURL } = newProps;
    this.displayURL(imageURL);
  }

  componentDidUpdate() {
    setTimeout(this.centeringImage, 300);
  }

  displayURL(url) {
    fetch(url).then(r => r.blob()).then((blob) => {
      const myReader = new FileReader();
      const { type } = blob;

      myReader.onload = () => {
        this.setState({ imageContent: myReader.result, type }, this.centeringImage);
      };

      myReader.readAsText(blob);
    });
  }

  centeringImage() {
    const svgEl = this.previewDiv.querySelector('#svg-file-container');
    const imgSelector = this.isSvg ? 'g > svg' : '#png-img-svg';
    const imgEl = svgEl.querySelector(imgSelector);
    if (!imgEl) return;

    const svgWidth = Math.floor(svgEl.getBoundingClientRect().width);

    let imgWidth;
    let imgHeight;

    if (this.isSvg) {
      imgWidth = Math.floor(imgEl.getBoundingClientRect().width);
      imgHeight = Math.floor(imgEl.getBoundingClientRect().height);
      svgEl.setAttribute('viewBox', `0 0 ${imgWidth} ${imgHeight}`);

      // SCALE SVG
      const height = optimizeHeight(imgWidth, imgHeight);
      svgEl.setAttribute('height', height);

      return;
    }

    const dummyImg = this.previewDiv.querySelector('#dummy-img');
    dummyImg.style.display = 'block';
    imgWidth = window.getComputedStyle(dummyImg).getPropertyValue('width');
    imgHeight = window.getComputedStyle(dummyImg).getPropertyValue('height');

    // SCALE Picture
    const intWidth = parseInt(imgWidth, 10);
    const intHeight = parseInt(imgHeight, 10);
    imgHeight = optimizeHeight(intWidth, intHeight);

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
    const { duration } = this.props;
    const { imageContent, type } = this.state;

    if (imageContent.length === 0 || type.length === 0) return <span />;

    let svg = imageContent;

    if (type === 'image/png') {
      this.isSvg = false;

      svg = `
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <image id="png-img-svg" xlink:href="${imageContent}" width="100%" height="100%" />
        </svg>
      `;
    } else {
      svg = imageContent;
    }

    let dummyImg = (<span />);
    if (!this.isSvg) {
      dummyImg = (<img id="dummy-img" alt="" src={imageContent} />);
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
  imageURL: PropTypes.string.isRequired,
  duration: PropTypes.number,
};

PreviewFileZoomPan.defaultProps = {
  duration: 200,
};
