import React from 'react';
import PropTypes from 'prop-types';
import { LineChart } from 'src/components/nmr_sim/LineChart';

export default class LineChartWrapper extends React.Component {
  constructor(props) {
    super(props);

    this.d3Ref = React.createRef();
  }

  componentDidMount() {
    const node = this.d3Ref.current;

    LineChart.create({
      data: this.props.data,
      type: this.props.type,
      el: node,
    });
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps) {
    const node = this.d3Ref.current;

    LineChart.update({
      data: nextProps.data,
      type: nextProps.type,
      el: node,
    });
  }

  componentWillUnmount() {
    const node = this.d3Ref.current;

    LineChart.destroy(node);
  }

  render() {
    return (
      <div
        className="nmr-chart"
        ref={this.d3Ref}
      />
    );
  }
}

LineChartWrapper.propTypes = {
  data: PropTypes.array,
  type: PropTypes.string,
};
