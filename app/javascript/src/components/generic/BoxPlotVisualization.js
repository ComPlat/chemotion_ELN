import React, { Component, createRef } from 'react';
import PropTypes from 'prop-types';
import { BoxPlotChart } from 'src/components/generic/d3/BoxPlotChart';
import { normalizeMttResult } from 'src/utilities/mttDataProcessor';

class BoxPlotVisualization extends Component {
  constructor(props) {
    super(props);
    this.ref = createRef();
  }

  componentDidMount() {
    BoxPlotChart.create(this.getChartData());
  }

  componentDidUpdate(prevProps) {
    // Only update if outputData has changed
    if (JSON.stringify(prevProps.outputData) !== JSON.stringify(this.props.outputData)) {
      BoxPlotChart.update(this.getChartData());
    }
  }

  componentWillUnmount() {
    BoxPlotChart.destroy(this.ref.current);
  }

  transformOutputData() {
    const { outputData } = this.props;

    // Return empty array if no data
    if (!outputData || !outputData.input || outputData.input.length === 0) {
      return [];
    }

    // Group input data by concentration
    const groupedByConcentration = {};

    outputData.input.forEach(item => {
      const { conc } = item;
      if (!groupedByConcentration[conc]) {
        groupedByConcentration[conc] = [];
      }
      groupedByConcentration[conc].push(Number(item.values));
    });

    // Transform to chart format
    const chartData = Object.keys(groupedByConcentration)
      .map(conc => ({
        concentration: parseFloat(conc),
        values: groupedByConcentration[conc]
      }))
      .sort((a, b) => a.concentration - b.concentration);

    return chartData;
  }

  getSampleName() {
    const { outputData } = this.props;
    if (outputData && outputData.result && outputData.result.length > 0) {
      return outputData.result[0].name || 'Sample';
    }
    return 'Sample';
  }

  getIC50Data() {
    const { outputData } = this.props;
    if (outputData && outputData.result && outputData.result.length > 0) {
      const result = normalizeMttResult(outputData.result[0]);
      return {
        ic50: result.icRelative,
        ic50Lower: result.icRelativeLower,
        ic50Higher: result.icRelativeHigher,
        asymptoteTwo: result.asymptote_two // Upper asymptote for bracket Y position
      };
    }
    return null;
  }

  getHillParameters() {
    const { outputData } = this.props;
    if (outputData && outputData.result && outputData.result.length > 0) {
      const result = normalizeMttResult(outputData.result[0]);
      return {
        ic50: result.icRelative,
        hillCoefficient: result.HillCoefficient,
        asymptoteMin: result.asymptote_one, // minimum response
        asymptoteMax: result.asymptote_two  // maximum response
      };
    }
    return null;
  }

  getChartData() {
    const chartData = this.transformOutputData();

    return {
      data: chartData.length > 0 ? chartData : this.getDefaultData(),
      el: this.ref.current,
      sampleName: this.getSampleName(),
      ic50Data: this.getIC50Data(),
      // hillParameters: this.getHillParameters()
      hillParameters: null
    };
  }

  getDefaultData() {
    // Fallback data when no real data is available
    return [
      {
        concentration: 0,
        values: [1.0],
      }
    ];
  }

  render() {
    const { outputData } = this.props;
    const hasData = outputData && outputData.input && outputData.input.length > 0;

    return (
      <div className="d-flex flex-column align-items-center">
        {!hasData && (
          <p className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>
            No input data available for visualization
          </p>
        )}
        <div ref={this.ref} />
      </div>
    );
  }
}

BoxPlotVisualization.propTypes = {
  outputData: PropTypes.shape({
    input: PropTypes.arrayOf(PropTypes.shape({
      conc: PropTypes.number,
      values: PropTypes.number,
      name: PropTypes.string,
      well_id: PropTypes.number,
      sample_id: PropTypes.number,
      readout_id: PropTypes.number,
      wellplate_id: PropTypes.string
    })),
    result: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string,
      // legacy (v1) keys
      IC50_relative: PropTypes.number,
      pIC50: PropTypes.number,
      // current (v2) keys
      IC_25_relative: PropTypes.number,
      pIC: PropTypes.number,
      unit: PropTypes.string,
      HillCoefficient: PropTypes.number,
      RSE: PropTypes.number,
      p_value: PropTypes.number
    }))
  })
};

BoxPlotVisualization.defaultProps = {
  outputData: null
};

export default BoxPlotVisualization;
