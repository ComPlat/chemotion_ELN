import React from 'react';
import SystemSelect from 'src/components/generic/SystemSelect';
import { molOptions, samOptions } from 'src/apps/admin/generic/Utils';
import AttrChk from 'src/components/generic/AttrChk';

const DefinedRenderer = (props) => {
  const {
    unitConfig, node, selDefined, chkAttr
  } = props;
  if (node.data.type === 'system-defined') return <SystemSelect unitConfig={unitConfig} selDefined={selDefined} node={node} />;
  if (node.data.type === 'drag_molecule') return <AttrChk chkAttr={chkAttr} node={node} attrOpts={molOptions} />;
  if (node.data.type === 'drag_sample') return <AttrChk chkAttr={chkAttr} node={node} attrOpts={samOptions} />;
  return node.data.value || null;
};

export default DefinedRenderer;
