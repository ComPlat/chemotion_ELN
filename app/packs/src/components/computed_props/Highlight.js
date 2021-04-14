import React from 'react';
import { ScaleUtils, AbstractSeries } from 'react-vis';

function cropDimension(loc, startLoc, minLoc, maxLoc) {
  if (loc < startLoc) {
    return {
      start: Math.max(loc, minLoc),
      stop: startLoc
    };
  }

  return {
    stop: Math.min(loc, maxLoc),
    start: startLoc
  };
}

export default class Highlight extends AbstractSeries {
  constructor(props) {
    super(props);

    this.state = {
      drawing: false,
      drawArea: {
        top: 0, right: 0, bottom: 0, left: 0
      },
      x_start: 0,
      y_start: 0,
      xMode: false,
      yMode: false,
      xyMode: false
    };

    this.stopDrawing = this.stopDrawing.bind(this);
    this.onParentMouseDown = this.onParentMouseDown.bind(this);
    this.getMousePosition = this.getMousePosition.bind(this);
  }

  componentDidMount() {
    document.addEventListener('mouseup', this.stopDrawing);
  }

  componentWillUnmount() {
    document.removeEventListener('mouseup', this.stopDrawing);
  }

  getDrawArea(loc) {
    const { innerWidth, innerHeight } = this.props;
    const {
      drawArea, xStart, yStart, xMode, yMode, xyMode
    } = this.state;
    const { x, y } = loc;
    let out = drawArea;

    if (xMode || xyMode) {
      const { start, stop } = cropDimension(x, xStart, 0, innerWidth);
      out = {
        ...out,
        left: start,
        right: stop
      };
    }
    if (yMode || xyMode) {
      const { start, stop } = cropDimension(y, yStart, 0, innerHeight);
      out = {
        ...out,
        top: innerHeight - start,
        bottom: innerHeight - stop
      };
    }
    return out;
  }

  onParentMouseDown(e) {
    const { innerHeight, innerWidth, onBrushStart } = this.props;
    const { x, y } = this.getMousePosition(e);
    const yRect = innerHeight - y;

    if (x < 0 && y >= 0) {
      this.setState({
        yMode: true,
        drawing: true,
        drawArea: {
          top: yRect,
          right: innerWidth,
          bottom: yRect,
          left: 0
        },
        yStart: y
      });
    } else if (x >= 0 && y < 0) {
      this.setState({
        xMode: true,
        drawing: true,
        drawArea: {
          top: innerHeight,
          right: x,
          bottom: 0,
          left: x
        },
        xStart: x
      });
    } else if (x >= 0 && y >= 0) {
      this.setState({
        xyMode: true,
        drawing: true,
        drawArea: {
          top: yRect,
          right: x,
          bottom: yRect,
          left: x
        },
        xStart: x,
        yStart: y
      });
    }

    if (onBrushStart) {
      onBrushStart(e);
    }
  }

  // onParentTouchStart(e) {
  //   e.preventDefault();
  //   this.onParentMouseDown(e);
  // }

  stopDrawing() {
    this.setState({
      xMode: false,
      yMode: false,
      xyMode: false
    });

    if (!this.state.drawing) {
      return;
    }

    const { onBrushEnd } = this.props;
    const { drawArea } = this.state;
    const xScale = ScaleUtils.getAttributeScale(this.props, 'x');
    const yScale = ScaleUtils.getAttributeScale(this.props, 'y');

    // Clear the draw area
    this.setState({
      drawing: false,
      drawArea: {
        top: 0, right: 0, bottom: 0, left: 0
      },
      xStart: 0,
      yStart: 0
    });

    if (Math.abs(drawArea.right - drawArea.left) < 5) {
      onBrushEnd(null);
      return;
    }

    const domainArea = {
      bottom: yScale.invert(drawArea.top),
      right: xScale.invert(drawArea.right),
      top: yScale.invert(drawArea.bottom),
      left: xScale.invert(drawArea.left)
    };

    if (onBrushEnd) {
      onBrushEnd(domainArea);
    }
  }

  getMousePosition(e) {
    const { marginLeft, marginTop, innerHeight } = this.props;

    const locX = e.nativeEvent.offsetX - marginLeft;
    const locY = (innerHeight + marginTop) - e.nativeEvent.offsetY;

    return { x: locX, y: locY };
  }

  onParentMouseMove(e) {
    const { drawing } = this.state;

    if (drawing) {
      const pos = this.getMousePosition(e);
      const newDrawArea = this.getDrawArea(pos);
      this.setState({ drawArea: newDrawArea });
    }
  }

  render() {
    const {
      marginLeft, marginTop, innerWidth, innerHeight, color, opacity
    } = this.props;

    const {
      drawArea: {
        left, right, top, bottom
      }
    } = this.state;

    return (
      <g
        transform={`translate(${marginLeft}, ${marginTop})`}
        className="highlight-container"
      >
        <rect
          opacity="0"
          x={0}
          y={0}
          width={innerWidth}
          height={innerHeight}
        />
        <rect
          pointerEvents="none"
          opacity={opacity}
          fill={color}
          x={left}
          y={bottom}
          width={right - left}
          height={top - bottom}
        />
      </g>
    );
  }
}

const defaultProps = {
  allow: 'x',
  color: 'rgb(77, 182, 172)',
  opacity: 0.3
};

Highlight.defaultProps = {
  ...AbstractSeries,
  ...defaultProps
};

Highlight.displayName = 'ComputedPropsGraphHighlight';
