import React from 'react';
import PropTypes from 'prop-types';
import {
  XYPlot, HorizontalGridLines, VerticalGridLines,
  XAxis, YAxis, Hint, DiscreteColorLegend, MarkSeries,
} from 'react-vis';
import SvgFileZoomPan from 'react-svg-file-zoom-pan';

import Highlight from './Highlight';
import CustomAxisLabel from './CustomAxisLabel';

const previewStyle = {
  background: 'white',
  width: '200px'
};

export default class ComputedPropsGraph extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hintValue: null,
      svgPath: null,
      lastDrawLocation: null,
    };

    this.setHint = this.setHint.bind(this);
    this.removeHint = this.removeHint.bind(this);
  }

  setHint(value) {
    const { svgPath, ...hintValue } = value;
    this.setState({ hintValue, svgPath });
  }

  removeHint() {
    this.setState({ hintValue: null, svgPath: null });
  }

  render() {
    const {
      data, show, xAxis, yAxis, referencePoints
    } = this.props;

    if (!show || data.length === 0) return <span />;

    const refData = referencePoints.filter(ref => ref.x && ref.y);

    const { hintValue, svgPath, lastDrawLocation } = this.state;

    const xAxisLabel = xAxis.label || 'LUMO';
    const yAxisLabel = yAxis.label || 'ESP';

    let xDomain = xAxis.range;
    let yDomain = yAxis.range;
    if (lastDrawLocation) {
      xDomain = [lastDrawLocation.left, lastDrawLocation.right];
      yDomain = [lastDrawLocation.bottom, lastDrawLocation.top];
    }

    const dataInfo = {
      color: '#79c7e3',
      title: 'Data'
    };
    const refInfo = {
      color: '#1a3177',
      title: 'Reference'
    };

    return (
      <div>
        <div style={{ float: 'left' }}>
          <XYPlot
            height={450}
            width={450}
            xDomain={xDomain}
            yDomain={yDomain}
            margin={{
              left: 55, right: 10, top: 10, bottom: 55
            }}
          >
            <VerticalGridLines />
            <HorizontalGridLines />
            <XAxis />
            <YAxis />
            <Highlight
              onBrushEnd={area => this.setState({ lastDrawLocation: area })}
            />
            <MarkSeries
              data={data}
              onValueMouseOver={this.setHint}
              onValueMouseOut={this.removeHint}
              color={dataInfo.color}
            />
            <MarkSeries
              data={refData}
              onValueMouseOver={this.setHint}
              onValueMouseOut={this.removeHint}
              color={refInfo.color}
            />
            {hintValue && (
              <Hint value={hintValue}>
                <div className="rv-hint__content" style={previewStyle}>
                  <div>
                    <SvgFileZoomPan
                      svgPath={svgPath}
                      duration={300}
                      resize
                    />
                  </div>
                  <div className="rv-hint__content">
                    {Object.keys(hintValue).map(key => (
                      <div key={`rv-hint${key}`}>
                        <span className="rv-hint__title">
                          {key}
                        </span>
                        {': '}
                        <span className="rv-hint__value">
                          {hintValue[key]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Hint>
            )}
            <CustomAxisLabel title={`${xAxisLabel} (${xAxis.unit})`} xAxis />
            <CustomAxisLabel title={`${yAxisLabel} (${yAxis.unit})`} />
          </XYPlot>
        </div>
        <div style={{ float: 'right' }}>
          <DiscreteColorLegend
            width={105}
            items={[dataInfo, refInfo]}
          />
        </div>
      </div>
    );
  }
}

ComputedPropsGraph.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  show: PropTypes.bool.isRequired,
  xAxis: PropTypes.object.isRequired,
  yAxis: PropTypes.object.isRequired,
  referencePoints: PropTypes.arrayOf(PropTypes.object).isRequired,
  // referenceDesc: PropTypes.string.isRequired,
};
