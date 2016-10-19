import d3 from 'd3'
/* global $ */

class D3LineChart {
  constructor() {
    this.margin = {
      top: 0,
      bottom: 40,
      right: 10,
      left: 80,
    }
    this.width = 650 - this.margin.left - this.margin.right
    this.height = 400 - this.margin.top - this.margin.bottom
  }

  create(input) {
    this.drawChart(input);
  }

  update(input) {
    this.destroy(input.el);
    this.drawChart(input);
  }

  destroy(el) {
    d3.select(el).selectAll('svg').remove();
  }

  drawChart(props) {
    const { data, el, xAxisLabel, yAxisLabel } = props

    // Convert hh:mm:ss to hour decimal
    let decimalData = data.data.map(function (d) {
      if (!d.time) return {time: "0", value: "21"}

      let timeArray = d.time.split(':')

      let hours = parseFloat(timeArray[0].match(/\d+/g))
      let minutes = parseFloat(timeArray[1].match(/\d+/g))
      let seconds = parseFloat(timeArray[2].match(/\d+/g))

      let time = parseFloat((((seconds / 60) + minutes) / 60) + hours)
      time = time.toFixed(4)

      return {time: time, value: d.value}
    })

    // Sort by time
    decimalData.sort((a, b) => (a.time - b.time))

    const width = this.width
    const height = this.height
    const margin = this.margin

    const xExtent = d3.extent(decimalData, d => d.time)
    const yExtent = [
      d3.min(decimalData, d => parseFloat(d.value)),
      d3.max(decimalData, d => parseFloat(d.value))
    ]

    const xScale = d3.scale.linear().range([0, width]).domain(xExtent)
    const yScale = d3.scale.linear().range([height, 0]).domain(yExtent)

    const linePath = d3.svg.line()
                           .x(d => xScale(d.time))
                           .y(d => yScale(d.value))

    const zoomed = () => {
      svg.select('.x.axis').call(xAxis)
      svg.select('.y.axis').call(yAxis)

      svg.select('.x.grid')
         .call(makeXaxis.tickSize(-height, 0, 0).tickFormat(''))
      svg.select('.y.grid')
         .call(makeYaxis.tickSize(-width, 0, 0).tickFormat(''))

      svg.select('.line')
         .attr('class', 'line')
         .attr('d', linePath(decimalData))
    }

    const zoom = d3.behavior.zoom().y(yScale).x(xScale).on('zoom', zoomed)

    const resetZoom = () => {
      d3.transition().duration(200).tween('zoom', () => {
        const ix = d3.interpolate(xScale.domain(), xExtent)
        const iy = d3.interpolate(yScale.domain(), yExtent)

        d3.interpolate(xScale.domain(), xExtent)
        d3.interpolate(yScale.domain(), yExtent)

        return t => {
          zoom.x(xScale.domain(ix(t))).y(yScale.domain(iy(t)))
          zoomed()
        }
      })
    }

    const viewBoxWidth = width + margin.left + margin.right
    const viewBoxHeight = height + 2 * margin.top + 2 * margin.bottom

    const svg = d3.select(el)
                  .append('svg:svg')
                  .attr('id', 'line-chart')
                  .attr('width', width)
                  .attr('height', height)
                  .attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
                  .attr('perserveAspectRatio', 'xMinYMin')
                  .append('svg:g')
                  .attr('transform', `translate(${margin.left}, ${margin.top})`)
                  .call(zoom).on('dblclick.zoom', resetZoom)

    svg.append('svg:rect')
       .attr('width', width)
       .attr('height', height)
       .attr('class', 'plot')

    const xAxis = d3.svg.axis().scale(xScale).orient('bottom').ticks(5)
    const yAxis = d3.svg.axis().scale(yScale).orient('left').ticks(5)

    const makeXaxis = d3.svg.axis().scale(xScale).orient('bottom').ticks(5)
    const makeYaxis = d3.svg.axis().scale(yScale).orient('left').ticks(5)

    svg.append('svg:g')
        .attr('class', 'x axis')
        .attr('transform', `translate(0, ${height})`)
        .call(xAxis)

    svg.append('g')
        .attr('class', 'y axis')
        .call(yAxis)

    svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', `translate(0, ${height})`)
        .call(makeXaxis.tickSize(-height, 0, 0).tickFormat(''))

    svg.append('g')
        .attr('class', 'y grid')
        .call(makeYaxis.tickSize(-width, 0, 0).tickFormat(''))

    svg.append('text')
        .attr('text-anchor', 'middle')
        .attr('transform',
              `translate(${0 - margin.left + 15}, ${height / 2})rotate(-90)`)
        .text(yAxisLabel)

    svg.append('text')
        .attr('text-anchor', 'middle')  // this makes it easy to centre the text
        .attr('transform',
              `translate(${width / 2}, ${height + margin.bottom})`)
        .text(xAxisLabel)

    svg.append('svg:clipPath')
        .attr('id', 'clip')
        .append('svg:rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', height)

    const chartBody = svg.append('g')
                         .attr('clip-path', 'url(#clip)')

    chartBody.append('svg:path')
             .datum(data)
             .attr('class', 'line')
             .attr('d', linePath(decimalData))

    // responsive
    const chart = $('#line-chart')
    const aspect = chart.width() / chart.height()
    const container = chart.parent()

    $(window).on('resize', () => {
      const targetWidth = container.width()
      chart.attr('width', targetWidth)
      chart.attr('height', Math.round(targetWidth / aspect))
    }).trigger('resize')
  }
}

const LineChart = new D3LineChart()

export { LineChart }
