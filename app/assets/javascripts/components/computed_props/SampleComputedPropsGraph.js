import React from 'react';
import {
  ScatterChart, Scatter, CartesianGrid,
  XAxis, YAxis, Tooltip, Legend
} from 'recharts';

const etlSettings = [
  { x: -1.8, y: 50, type: 'reference' },
  { x: -1.8, y: 90, type: 'reference' },
  { x: -2.2, y: 50, type: 'reference' },
  { x: -2.0, y: 10, type: 'reference' },
  { x: -1.6, y: 10, type: 'reference' },
  { x: -1.4, y: 50, type: 'reference' }
];

function ComputedPropTooltip({ active, payload }) {
  if (!active) return null;

  let tooltipName = (
    <p>{`${payload[0].payload.name}`}</p>
  );

  const { type } = payload[0].payload;
  if (type === 'reference') {
    tooltipName = (
      <p>
        Compounds are interesting as material for the Electron Transport Layer (ETL)
      </p>
    );
  }

  return (
    <div className="computed-prop-custom-tooltip">
      <div className="tt-custom-content">
        {tooltipName}
        <p>
          {`${payload[0].name} : ${payload[0].value} ${payload[0].unit}`}
        </p>
        <p>
          {`${payload[1].name} : ${payload[1].value} ${payload[1].unit}`}
        </p>
      </div>
    </div>
  );
}

// ComputedPropTooltip.propTypes = {
//   active: React.PropTypes.bool,
//   payload: React.PropTypes.arrayOf(React.PropTypes.object),
// };

function SampleComputedPropsGraph({ graphData, show, style }) {
  if (!show || graphData.length === 0) return <span />;

  const data = graphData.filter(dat => dat.props).map(dat => ({
    name: dat.name,
    x: dat.props.lumo,
    y: dat.props.mean_abs_potential,
  }));

  const scatterMargin = {
    top: 20, right: 20, bottom: 20, left: 20
  };

  return (
    <ScatterChart
      width={400}
      height={400}
      margin={scatterMargin}
      style={style}
    >
      <XAxis
        type="number"
        dataKey="x"
        name="LUMO"
        unit="eV"
        padding={{ bottom: 10 }}
        domain={[-7, 2]}
        label={{ value: 'LUMO', offset: 0, position: 'insideBottom' }}
      />
      <YAxis
        type="number"
        dataKey="y"
        name="ESP"
        unit="mV"
        padding={{ left: 10 }}
        domain={[0, 400]}
        label={{ value: 'ESP', angle: -90, position: 'left' }}
      />
      <CartesianGrid />
      <Tooltip
        cursor={{ strokeDasharray: '2 2' }}
        content={<ComputedPropTooltip />}
      />
      <Legend verticalAlign="top" height={36} />
      <Scatter name="ETL properties" data={data} fill="#8884d8" />
      <Scatter name="Reference ETL" data={etlSettings} fill="#82ca9d" />
    </ScatterChart>
  );
}

SampleComputedPropsGraph.propTypes = {
  graphData: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
  show: React.PropTypes.bool.isRequired,
  style: React.PropTypes.object.isRequired
};

export default SampleComputedPropsGraph;
