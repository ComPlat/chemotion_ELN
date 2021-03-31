import React, { Component } from 'react';
import PropTypes from 'prop-types';
import uuid from 'uuid';
import { DropTarget } from 'react-dnd';
import Aviator from 'aviator';
import { Tooltip, OverlayTrigger, Popover } from 'react-bootstrap';
import UIStore from '../stores/UIStore';

const handleSampleClick = (type, id) => {
  const { currentCollection, isSync } = UIStore.getState();
  if (!isNaN(id)) type += `/${id}`;
  const collectionUrl = `${currentCollection.id}/${type}`;
  Aviator.navigate(isSync ? `/scollection/${collectionUrl}` : `/collection/${collectionUrl}`);
};

const show = (opt, iconClass) => {
  if (opt.value && opt.value.el_id) {
    const pop = (
      <Popover id="popover-svg" title={opt.value.el_tip} style={{ maxWidth: 'none', maxHeight: 'none' }}>
        <img src={opt.value.el_svg} style={{ height: '26vh', width: '26vh' }} alt="" />
      </Popover>
    );
    let label = opt.value.el_label;
    const simg = (path, tip, txt) => ((path && path !== '') ? (
      <div className="s-img">
        <OverlayTrigger trigger={['hover']} placement="left" rootClose onHide={null} overlay={pop}>
          <img src={path} alt="" />
        </OverlayTrigger>&nbsp;<span className="data">{txt}</span>
      </div>
    ) : (<OverlayTrigger placement="top" overlay={<Tooltip id={uuid.v4()}>{tip}</Tooltip>}><div className="data">{txt}</div></OverlayTrigger>));
    if (opt.value.el_type === 'sample') {
      if (opt.value.is_new !== true) {
        label = (
          <a role="link" onClick={() => handleSampleClick(opt.value.el_type, opt.value.el_id)} style={{ cursor: 'pointer' }}>
            <span className="reaction-material-link">{label}</span>
          </a>
        );
      }
    }
    return simg(opt.value.el_svg, opt.value.el_tip, label);
  }
  return (<span className={`icon-${iconClass} indicator`} />);
};

const source = (type, props) => {
  switch (type) {
    case 'molecule':
      return {
        el_id: props.molecule.id,
        el_type: 'molecule',
        el_label: props.molecule_name_label,
        el_tip: props.molecule_name_label,
      };
    case 'sample':
      return {
        el_id: props.id,
        is_new: true,
        el_type: 'sample',
        el_label: props.short_label,
        el_tip: props.short_label,
      };
    default:
      return {
        el_id: props.id,
        is_new: true,
        el_type: props.type,
        el_label: props.short_label,
        el_tip: props.short_label,
      };
  }
};

const dropTarget = {
  drop(targetProps, monitor) {
    const sourceProps = monitor.getItem().element;
    const sourceTag = source(targetProps.opt.type.split('_')[1], sourceProps);
    targetProps.onDrop(sourceTag);
  },
  canDrop(targetProps, monitor) {
    return true;
  },
};

const dropCollect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
});

class GenericElDropTarget extends Component {
  render() {
    const {
      connectDropTarget,
      isOver,
      canDrop,
      opt
    } = this.props;
    const iconClass = (opt.dndItems && opt.dndItems[0] === 'molecule' ? 'sample' : opt.dndItems[0]);
    const className = `target${isOver ? ' is-over' : ''}${canDrop ? ' can-drop' : ''}`;
    return connectDropTarget(<div className={className}>{show(opt, iconClass)}</div>);
  }
}

export default
DropTarget(props => props.opt.dndItems, dropTarget, dropCollect)(GenericElDropTarget);

GenericElDropTarget.propTypes = {
  connectDropTarget: PropTypes.func.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
};
