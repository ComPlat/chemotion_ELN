import React from 'react';
import ReactDOM from 'react-dom';
// import PropTypes from 'prop-types';

import { LineChart } from './LineChart';

export default class LineChartContainer extends React.Component {
  componentDidMount() {
    LineChart.create({
      data: this.props.data,
      el: this.getDOMNode(),
      xAxisLabel: this.props.xAxis,
      yAxisLabel: this.props.yAxis
    })
  }

  componentWillReceiveProps(nextProps) {
    LineChart.update({
      data: nextProps.data,
      el: this.getDOMNode(),
      xAxisLabel: nextProps.xAxis,
      yAxisLabel: nextProps.yAxis
    })
  }

  componentWillUnmount() {
    LineChart.destroy(this.getDOMNode())
  }

  getDOMNode() {
    return ReactDOM.findDOMNode(this)
  }

  render() {
    return (
      <div id="line-chart" />
    )
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
