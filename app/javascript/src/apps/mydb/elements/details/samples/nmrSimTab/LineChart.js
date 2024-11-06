import d3 from 'd3';

class D3LineChart {
  constructor() {
    this.margin = {
      top: 50,
      bottom: 50,
      right: 10,
      left: 90,
    };
    this.width = 1000 - this.margin.left - this.margin.right;
    this.height = 500 - this.margin.top - this.margin.bottom;
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
    const { data, el, type } = props;
    const width = this.width;
    const height = this.height;
    const margin = this.margin;

    const xExtent = d3.extent(data, d => d.x);
    const yExtent = d3.extent(data, d => d.y);

    const xScale = d3.scale.linear()
      .domain(xExtent)
      .range([width, 0]);
    const yScale = d3.scale.linear()
      .domain(yExtent)
      .range([height, 0]);

    const linePath = d3.svg.line()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y));

    const yFormat = d3.format('.2n');

    const zoomed = () => {
      svg.select('.x.axis').call(xAxis);
      svg.select('.y.axis').call(yAxis);
      svg.select('.x.grid')
        .call(makeXaxis
          .tickSize(-height, 0, 0)
          .tickFormat(''));
      svg.select('.y.grid')
        .call(makeYaxis
          .tickSize(-width, 0, 0)
          .tickFormat(''));
      svg.select('.line')
        .attr('class', 'line')
        .attr('d', linePath);
    };

    const zoom = d3.behavior.zoom()
      .x(xScale) // omit y
      .on('zoom', zoomed);

    const resetZoom = () => {
      d3.transition().duration(200).tween('zoom', () => {
        const ix = d3.interpolate(xScale.domain(), xExtent);
        d3.interpolate(yScale.domain(), yExtent);
        return t => {
          zoom.x(xScale.domain(ix(t))); // omit y
          zoomed();
        };
      });
    };

    const svg = d3.select(el)
      .append('svg:svg')
      .attr('id', 'line-chart')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .attr('viewBox', `0 0  ${width + margin.left + margin.right}
                                         ${height + margin.top + margin.bottom}`)
      .attr('perserveAspectRatio', 'xMinYMid')
      .append('svg:g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`)
      .call(zoom).on('dblclick.zoom', resetZoom);

    svg.append('svg:rect')
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'plot');

    const xAxis = d3.svg.axis()
      .scale(xScale)
      .orient('bottom')
      .ticks(5);
    const yAxis = d3.svg.axis()
      .scale(yScale)
      .orient('left')
      .ticks(5)
      .tickFormat(yFormat);
    const makeXaxis = d3.svg.axis()
      .scale(xScale)
      .orient('bottom')
      .ticks(5);
    const makeYaxis = d3.svg.axis()
      .scale(yScale)
      .orient('left')
      .ticks(5);

    svg.append('svg:g')
      .attr('class', 'x axis')
      .attr('transform', `translate(0, ${height})`)
      .call(xAxis);

    svg.append('g')
      .attr('class', 'y axis')
      .call(yAxis);

    svg.append('g')
      .attr('class', 'x grid')
      .attr('transform', `translate(0, ${height})`)
      .call(makeXaxis
        .tickSize(-height, 0, 0)
        .tickFormat(''));

    svg.append('g')
      .attr('class', 'y grid')
      .call(makeYaxis
        .tickSize(-width, 0, 0)
        .tickFormat(''));

    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('transform', `translate(${0 - margin.left + 15}, ${height / 2})rotate(-90)`)
      .text('Y(A.U)');
    svg.append('text')
      .attr('text-anchor', 'middle')  // this makes it easy to centre the text
      .attr('transform', `translate(${width / 2}, ${height + margin.bottom})`)
      .text('X(PPM)');

    svg.append('svg:clipPath')
      .attr('id', 'clip')
      .append('svg:rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', width)
      .attr('height', height);

    const chartBody = svg.append('g')
      .attr('clip-path', 'url(#clip)');

    chartBody.append('svg:path')
      .datum(data)
      .attr('class', 'line')
      .attr('d', linePath);

    // display type on the top-right corner
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('transform', `translate(${width - 50}, 30)`)
      .text(`NMR ${type}`);
    svg.append('rect')
      .attr('transform', `translate(${width - 120}, 25)`)
      .attr('width', 30)
      .attr('height', 1)
      .attr('class', 'line');

    // responsive
    const chart = $('#line-chart');
    const aspect = chart.width() / chart.height();
    const container = chart.parent();

    $(window).on('resize', () => {
      const targetWidth = container.width();
      chart.attr('width', targetWidth);
      chart.attr('height', Math.round(targetWidth / aspect));
    }).trigger('resize');
  }
}

const LineChart = new D3LineChart();

export { LineChart };
