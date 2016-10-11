import React from 'react'
import ReactDOM from 'react-dom'
import { LineChart } from './LineChart'

export default class LineChartContainer extends React.Component {
  componentDidMount() {
    LineChart.create({
      data: this.props.data,
      el: this.getDOMNode(),
      xAxis: this.props.xAxis,
      yAxis: this.props.yAxis
    })
  }

  componentWillReceiveProps(nextProps) {
    LineChart.update({
      data: nextProps.data,
      el: this.getDOMNode(),
      xAxisLabel: this.props.xAxis,
      yAxisLabel: this.props.yAxis
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
//   data: React.PropTypes.shape({
//     timeUnit: React.PropTypes.string.isRequired,
//     valueUnit: React.PropTypes.string.isRequired,
//     data: React.PropTypes.arrayOf(React.PropTypes.shape({
//       time: React.PropTypes.number.isRequired,
//       value: React.PropTypes.number.isRequired
//     }))
//   })
// }
