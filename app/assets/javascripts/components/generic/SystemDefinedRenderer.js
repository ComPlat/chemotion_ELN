import React from 'react';
import SystemSelect from './SystemSelect';

const SystemDefinedRenderer = (props) => {
  const { unitConfig, node, selDefined } = props;
  if (node.data.type === 'system-defined') return <SystemSelect unitConfig={unitConfig} selDefined={selDefined} node={node} />;
  return node.data.value || null;
};

export default SystemDefinedRenderer;
