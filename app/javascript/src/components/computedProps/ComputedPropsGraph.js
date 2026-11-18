import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  VictoryChart,
  VictoryScatter,
  VictoryAxis,
  VictoryZoomContainer,
} from 'victory';
import SvgFileZoomPan from 'react-svg-file-zoom-pan';

const COLORS = { data: '#79c7e3', reference: '#1a3177' };

const VICTORY_INTERNAL_KEYS = new Set([
  '_x', '_y', '_x0', '_y0', '_x1', '_y1', 'eventKey', 'childName', 'style',
]);

const previewStyle = {
  background: 'white',
  border: '1px solid #ccc',
  borderRadius: 4,
  padding: '8px',
  width: '200px',
  position: 'absolute',
  zIndex: 10,
  pointerEvents: 'none',
};

const ComputedPropsGraph = ({
  data, show, xAxis, yAxis, referencePoints
}) => {
  const [hintValue, setHintValue] = useState(null);
  const [svgPath, setSvgPath] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e) => {
    setMousePos({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
  }, []);

  const scatterEvents = [{
    target: 'data',
    eventHandlers: {
      onMouseOver: (_evt, { datum }) => {
        const { svgPath: path, ...rest } = datum;
        setHintValue(rest);
        setSvgPath(path);
        return [];
      },
      onMouseOut: () => {
        setHintValue(null);
        setSvgPath(null);
        return [];
      },
    },
  }];

  if (!show || data.length === 0) return <span />;

  const refData = referencePoints
    .filter(ref => ref.x && ref.y)
    .map(ref => ({ ...ref, x: Number(ref.x), y: Number(ref.y) }));

  const xAxisLabel = xAxis.label || 'LUMO';
  const yAxisLabel = yAxis.label || 'ESP';

  const xRange = xAxis.range || [-7, 2];
  const yRange = yAxis.range || [0, 400];

  const computeTickValues = (range, maxTicks) => {
    const span = range[1] - range[0];
    const roughStep = span / maxTicks;
    const niceSteps = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500];
    const step = niceSteps.find(s => s >= roughStep) || 500;
    const start = Math.ceil(range[0] / step) * step;
    const ticks = [];
    for (let v = start; v <= range[1] + step * 0.001; v += step) {
      ticks.push(Math.round(v * 1000) / 1000);
    }
    return ticks;
  };

  const xTickValues = computeTickValues(xRange, 10);
  const yTickValues = computeTickValues(yRange, 9);

  return (
    <div className="d-flex align-self-start position-relative">
      <div
        className="flex-grow-1 me-3 mt-3"
        style={{ maxWidth: '470px' }}
        onMouseMove={handleMouseMove}
      >
        <VictoryChart
          height={450}
          width={470}
          domain={{ x: xRange, y: yRange }}
          padding={{ left: 55, right: 10, top: 10, bottom: 55 }}
          containerComponent={<VictoryZoomContainer zoomDomain={{ x: xRange, y: yRange }} />}
        >
          <VictoryAxis
            crossAxis
            label={`${xAxisLabel} (${xAxis.unit})`}
            tickValues={xTickValues}
            offsetY={54}
            orientation="bottom"
            style={{
              grid: { stroke: '#d0d0d0', strokeWidth: 1 },
              axisLabel: { padding: 30 },
            }}
          />
          <VictoryAxis
            dependentAxis
            label={`${yAxisLabel} (${yAxis.unit})`}
            tickValues={yTickValues}
            offsetX={54}
            orientation="left"
            style={{
              grid: { stroke: '#d0d0d0', strokeWidth: 1 },
              axisLabel: { padding: 40 },
            }}
          />
          <VictoryScatter
            data={data}
            size={6}
            style={{ data: { fill: COLORS.data } }}
            events={scatterEvents}
          />
          <VictoryScatter
            data={refData}
            size={6}
            style={{ data: { fill: COLORS.reference } }}
            events={scatterEvents}
          />
        </VictoryChart>
        {hintValue && (
          <div style={{ ...previewStyle, left: mousePos.x + 12, top: mousePos.y + 12 }}>
            {svgPath && (
              <div style={{ height: 120, overflow: 'hidden' }}>
                <SvgFileZoomPan svgPath={svgPath} duration={300} resize />
              </div>
            )}
            {Object.keys(hintValue)
              .filter(key => !VICTORY_INTERNAL_KEYS.has(key) && !key.startsWith('_'))
              .map(key => (
                <div key={key}>
                  <strong>{key}</strong>
                  {': '}
                  {hintValue[key]}
                </div>
              ))}
          </div>
        )}
      </div>
      <div className="flex-shrink-0 ps-2 pt-2 mt-3">
        <div className="d-flex align-items-center mb-1">
          <span style={{ color: COLORS.data, fontSize: 18, marginRight: 6 }}>&#9679;</span>
          Data
        </div>
        <div className="d-flex align-items-center">
          <span style={{ color: COLORS.reference, fontSize: 18, marginRight: 6 }}>&#9679;</span>
          Reference
        </div>
      </div>
    </div>
  );
};

ComputedPropsGraph.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  show: PropTypes.bool.isRequired,
  xAxis: PropTypes.object.isRequired,
  yAxis: PropTypes.object.isRequired,
  referencePoints: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default ComputedPropsGraph;
