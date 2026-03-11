import d3 from 'd3';

class D3BoxPlotChart {
  constructor() {
    this.margin = {
      top: 20,
      bottom: 50,
      right: 20,
      left: 60,
    };
    this.width = 650 - this.margin.left - this.margin.right;
    this.height = 400 - this.margin.top - this.margin.bottom;
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
    // Remove any tooltips
    d3.selectAll('.boxplot-tooltip').remove();
  }

  // Calculate quartiles for box plot
  calculateQuartiles(values) {
    const sorted = values.slice().sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    const q1Index = Math.floor(sorted.length * 0.25);
    const q2Index = Math.floor(sorted.length * 0.5);
    const q3Index = Math.floor(sorted.length * 0.75);

    return {
      min,
      q1: sorted[q1Index],
      median: sorted[q2Index],
      q3: sorted[q3Index],
      max,
    };
  }

  // Quadratic curve fitting using least squares
  // Calculate Hill equation (4-parameter logistic) value
  // y = min + (max - min) / (1 + (x / IC50)^HillCoeff)
  hillEquation(x, params) {
    const { ic50, hillCoefficient, asymptoteMin, asymptoteMax } = params;
    return asymptoteMin + (asymptoteMax - asymptoteMin) / (1 + Math.pow(x / ic50, hillCoefficient));
  }

  drawChart(props) {
    const { data, el, sampleName = 'S1', ic50Data = null, hillParameters = null } = props;
    const width = this.width;
    const height = this.height;
    const margin = this.margin;

    // Calculate box plot statistics for each concentration
    const boxPlotData = data.map(d => ({
      concentration: d.concentration,
      stats: this.calculateQuartiles(d.values),
      values: d.values, // Keep original values for plotting points
    }));

    // Setup scales
    const concentrations = data.map(d => d.concentration);
    const allValues = data.flatMap(d => d.values);

    const xMin = Math.min(...concentrations);
    const xMax = Math.max(...concentrations);
    const xPadding = (xMax - xMin) * 0.1 || 5; // Add 10% padding or minimum 5

    const xScale = d3.scale.linear()
      .domain([Math.max(0, xMin - xPadding), xMax + xPadding])
      .range([0, width]);

    const yMin = Math.min(...allValues);
    const yMax = Math.max(...allValues);
    const yPadding = (yMax - yMin) * 0.15 || 0.1; // Add 15% padding

    const yScale = d3.scale.linear()
      .domain([Math.max(0, yMin - yPadding), yMax + yPadding])
      .range([height, 0]);

    // Create SVG
    const svgContainer = d3.select(el)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);

    // Add grey background
    svgContainer.append('rect')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .attr('fill', '#f5f5f5');

    const svg = svgContainer.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Create tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'boxplot-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px 12px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000')
      .style('box-shadow', '0 2px 4px rgba(0,0,0,0.2)');

    // Add axes
    const xAxis = d3.svg.axis()
      .scale(xScale)
      .orient('bottom')
      .ticks(5);

    const yAxis = d3.svg.axis()
      .scale(yScale)
      .orient('left')
      .ticks(5);

    svg.append('g')
      .attr('class', 'x axis')
      .attr('transform', `translate(0, ${height})`)
      .call(xAxis);

    svg.append('g')
      .attr('class', 'y axis')
      .call(yAxis);

    // Add axis labels
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 10})`)
      .style('font-size', '14px')
      .text('Concentration');

    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('transform', `translate(${-margin.left + 15}, ${height / 2})rotate(-90)`)
      .style('font-size', '14px')
      .text('Viability');

    // Add "S1" label in top-left (use sample name from data)
    svg.append('text')
      .attr('x', 10)
      .attr('y', 10)
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text(sampleName);

    // Draw box plots
    const boxWidth = 30;

    boxPlotData.forEach(d => {
      const x = xScale(d.concentration);
      const { min, q1, median, q3, max } = d.stats;

      // Create an invisible hover area for the box plot
      const hoverGroup = svg.append('g')
        .attr('class', 'boxplot-hover-group')
        .style('cursor', 'pointer');

      // Invisible wide rectangle for easier hover
      hoverGroup.append('rect')
        .attr('x', x - boxWidth)
        .attr('y', yScale(max) - 10)
        .attr('width', boxWidth * 2)
        .attr('height', yScale(min) - yScale(max) + 20)
        .attr('fill', 'transparent')
        .on('mouseover', function() {
          // Highlight box
          boxRect.style('fill', '#e3f2fd');
          tooltip.style('visibility', 'visible')
            .html(`
              <strong>Concentration: ${d.concentration}</strong><br/>
              Max: ${max.toFixed(3)}<br/>
              Q3: ${q3.toFixed(3)}<br/>
              Median: ${median.toFixed(3)}<br/>
              Q1: ${q1.toFixed(3)}<br/>
              Min: ${min.toFixed(3)}
            `);
        })
        .on('mousemove', function() {
          tooltip
            .style('top', (d3.event.pageY - 10) + 'px')
            .style('left', (d3.event.pageX + 10) + 'px');
        })
        .on('mouseout', function() {
          boxRect.style('fill', 'white');
          tooltip.style('visibility', 'hidden');
        });

      // Vertical line (whisker) from min to max
      svg.append('line')
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', yScale(min))
        .attr('y2', yScale(max))
        .attr('stroke', 'black')
        .attr('stroke-width', 1);

      // Min line (lower whisker cap)
      svg.append('line')
        .attr('x1', x - boxWidth / 4)
        .attr('x2', x + boxWidth / 4)
        .attr('y1', yScale(min))
        .attr('y2', yScale(min))
        .attr('stroke', 'black')
        .attr('stroke-width', 1.5);

      // Max line (upper whisker cap)
      svg.append('line')
        .attr('x1', x - boxWidth / 4)
        .attr('x2', x + boxWidth / 4)
        .attr('y1', yScale(max))
        .attr('y2', yScale(max))
        .attr('stroke', 'black')
        .attr('stroke-width', 1.5);

      // Box (Q1 to Q3) - store reference for hover effect
      const boxRect = svg.append('rect')
        .attr('x', x - boxWidth / 2)
        .attr('y', yScale(q3))
        .attr('width', boxWidth)
        .attr('height', yScale(q1) - yScale(q3))
        .attr('fill', 'white')
        .attr('stroke', 'black')
        .attr('stroke-width', 1)
        .style('transition', 'fill 0.2s');

      // Median line
      svg.append('line')
        .attr('x1', x - boxWidth / 2)
        .attr('x2', x + boxWidth / 2)
        .attr('y1', yScale(median))
        .attr('y2', yScale(median))
        .attr('stroke', 'black')
        .attr('stroke-width', 2);

      // Draw individual data points as small circles with hover
      d.values.forEach(value => {
        svg.append('circle')
          .attr('cx', x)
          .attr('cy', yScale(value))
          .attr('r', 2.5)
          .attr('fill', 'black')
          .attr('opacity', 0.6)
          .style('cursor', 'pointer')
          .on('mouseover', function() {
            d3.select(this)
              .attr('r', 4)
              .attr('fill', '#2196F3')
              .attr('opacity', 1);
            tooltip.style('visibility', 'visible')
              .html(`
                <strong>Concentration: ${d.concentration}</strong><br/>
                Value: ${value.toFixed(3)}
              `);
          })
          .on('mousemove', function() {
            tooltip
              .style('top', (d3.event.pageY - 10) + 'px')
              .style('left', (d3.event.pageX + 10) + 'px');
          })
          .on('mouseout', function() {
            d3.select(this)
              .attr('r', 2.5)
              .attr('fill', 'black')
              .attr('opacity', 0.6);
            tooltip.style('visibility', 'hidden');
          });
      });
    });

    // Draw dose-response curve
    if (hillParameters && hillParameters.ic50 && hillParameters.hillCoefficient) {
      // Use Hill equation (4PL) to generate smooth curve
      const xDomain = xScale.domain();
      const curvePoints = [];
      const numPoints = 100;

      for (let i = 0; i <= numPoints; i++) {
        const x = xDomain[0] + (xDomain[1] - xDomain[0]) * (i / numPoints);
        if (x > 0) { // Hill equation requires positive concentrations
          const y = this.hillEquation(x, hillParameters);
          curvePoints.push({ x, y });
        }
      }

      const line = d3.svg.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
        .interpolate('basis'); // Smooth interpolation

      svg.append('path')
        .datum(curvePoints)
        .attr('class', 'dose-response-curve')
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', 'black')
        .attr('stroke-width', 2);

      // Add invisible wider path for easier hover on curve
      const hillEquationRef = this.hillEquation.bind(this);
      svg.append('path')
        .datum(curvePoints)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', 'transparent')
        .attr('stroke-width', 10)
        .style('cursor', 'crosshair')
        .on('mouseover', function() {
          svg.selectAll('.dose-response-curve')
            .attr('stroke', '#2196F3')
            .attr('stroke-width', 3);
        })
        .on('mousemove', function() {
          try {
            const svgNode = svg.node();
            const mouse = d3.mouse(svgNode);
            const xPos = xScale.invert(mouse[0]);
            if (xPos > 0) {
              const yPos = hillEquationRef(xPos, hillParameters);
              tooltip.style('visibility', 'visible')
                .html(`
                  <strong>Dose-Response Curve</strong><br/>
                  Concentration: ${xPos.toFixed(2)}<br/>
                  Predicted Response: ${yPos.toFixed(3)}<br/>
                  <em>IC50: ${hillParameters.ic50.toFixed(2)}</em>
                `);
              tooltip
                .style('top', (d3.event.pageY - 10) + 'px')
                .style('left', (d3.event.pageX + 10) + 'px');
            }
          } catch (e) {
            console.error('Error in curve hover:', e);
          }
        })
        .on('mouseout', function() {
          svg.selectAll('.dose-response-curve')
            .attr('stroke', 'black')
            .attr('stroke-width', 2);
          tooltip.style('visibility', 'hidden');
        });
    }

    // Draw red annotation bracket for IC50 confidence interval (if available)
    if (ic50Data && ic50Data.ic50Lower && ic50Data.ic50Higher && ic50Data.asymptoteTwo) {
      const bracketY = ic50Data.asymptoteTwo; // Use upper asymptote as Y position
      const bracketXStart = ic50Data.ic50Lower;
      const bracketXEnd = ic50Data.ic50Higher;
      const yRange = yScale.domain()[1] - yScale.domain()[0];
      const bracketCapHeight = yRange * 0.02; // 2% of Y range

      // Horizontal line
      svg.append('line')
        .attr('x1', xScale(bracketXStart))
        .attr('x2', xScale(bracketXEnd))
        .attr('y1', yScale(bracketY))
        .attr('y2', yScale(bracketY))
        .attr('stroke', '#d32f2f')
        .attr('stroke-width', 2);

      // Left vertical cap
      svg.append('line')
        .attr('x1', xScale(bracketXStart))
        .attr('x2', xScale(bracketXStart))
        .attr('y1', yScale(bracketY - bracketCapHeight))
        .attr('y2', yScale(bracketY + bracketCapHeight))
        .attr('stroke', '#d32f2f')
        .attr('stroke-width', 2);

      // Right vertical cap
      svg.append('line')
        .attr('x1', xScale(bracketXEnd))
        .attr('x2', xScale(bracketXEnd))
        .attr('y1', yScale(bracketY - bracketCapHeight))
        .attr('y2', yScale(bracketY + bracketCapHeight))
        .attr('stroke', '#d32f2f')
        .attr('stroke-width', 2);
    }

    // Add grid lines
    svg.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0, ${height})`)
      .call(xAxis.tickSize(-height, 0, 0).tickFormat(''))
      .selectAll('line')
      .attr('stroke', '#e0e0e0')
      .attr('opacity', 0.5);

    svg.append('g')
      .attr('class', 'grid')
      .call(yAxis.tickSize(-width, 0, 0).tickFormat(''))
      .selectAll('line')
      .attr('stroke', '#e0e0e0')
      .attr('opacity', 0.5);

    // Style axes
    svg.selectAll('.axis path, .axis line')
      .attr('fill', 'none')
      .attr('stroke', '#000')
      .attr('shape-rendering', 'crispEdges');
  }
}

const BoxPlotChart = new D3BoxPlotChart();

export { BoxPlotChart };
