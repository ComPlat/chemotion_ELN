import React from 'react';
import SystemSelect from './SystemSelect';
import MolAttrSelect from './MolAttrSelect';

const SystemDefinedRenderer = (props) => {
  const { unitConfig, node, selDefined, selMolAttr } = props;
  if (node.data.type === 'system-defined') return <SystemSelect unitConfig={unitConfig} selDefined={selDefined} node={node} />;
  if (node.data.type === 'drag_molecule') return <MolAttrSelect selMolAttr={selMolAttr} node={node} />;
  return node.data.value || null;
};

export default SystemDefinedRenderer;
