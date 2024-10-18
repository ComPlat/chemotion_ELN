import React, { createRef } from 'react';
import { LineChart } from 'src/components/lineChart/LineChart';

export default class LineChartContainer extends React.Component {
  constructor(props) {
    super(props);
    this.ref = createRef();
  }

  componentDidMount() {
    LineChart.create(this.getLineChartData());
  }

  componentDidUpdate() {
    LineChart.update(this.getLineChartData());
  }

  getLineChartData() {
    const { data, xAxis, yAxis } = this.props;
    return {
      data: data,
      el: this.ref.current,
      xAxisLabel: xAxis,
      yAxisLabel: yAxis
    };
  }

  componentWillUnmount() {
    LineChart.destroy(this.ref.current)
  }

  render() {
    return (
      <div ref={this.ref} />
    );
  }
}

// LineChartContainer.propTypes = {
//   data: PropTypes.shape({
//     timeUnit: PropTypes.string.isRequired,
//     valueUnit: PropTypes.string.isRequired,
//     data: PropTypes.arrayOf(PropTypes.shape({
//       time: PropTypes.number.isRequired,
//       value: PropTypes.number.isRequired
//     }))
//   })
// }
