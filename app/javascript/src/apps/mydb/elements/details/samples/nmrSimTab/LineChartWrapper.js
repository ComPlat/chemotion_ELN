import React from 'react';
import PropTypes from 'prop-types';
import { LineChart } from 'src/apps/mydb/elements/details/samples/nmrSimTab/LineChart';

export default class LineChartWrapper extends React.Component {
  constructor(props) {
    super(props);

    this.d3Ref = React.createRef();
  }

  componentDidMount() {
    LineChart.create(this.getLineChartData());
  }

  // eslint-disable-next-line camelcase
  componentDidUpdate() {
    LineChart.update(this.getLineChartData());
  }

  getLineChartData() {
    const { data, type } = this.props;
    const el = this.d3Ref.current;
    return { data, type, el };
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
