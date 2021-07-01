/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import uuid from 'uuid';
import { DropTarget } from 'react-dnd';
import Aviator from 'aviator';
import { Tooltip, OverlayTrigger, Popover, Button } from 'react-bootstrap';
import UIStore from '../stores/UIStore';

const handleSampleClick = (type, id) => {
  const { currentCollection, isSync } = UIStore.getState();
  if (!isNaN(id)) type += `/${id}`;
  const collectionUrl = `${currentCollection.id}/${type}`;
  Aviator.navigate(isSync ? `/scollection/${collectionUrl}` : `/collection/${collectionUrl}`);
};

const base = (opt, iconClass, onDrop = () => {}, params = {}) => {
  if (opt.value && opt.value.el_id) {
    const pop = (
      <Popover id="popover-svg" style={{ maxWidth: 'none', maxHeight: 'none' }}>
        <img src={opt.value.el_svg} style={{ height: '26vh', width: '26vh' }} alt="" />
      </Popover>
    );
    let label = opt.value.el_label;
    const simg = (path, tip, txt) => ((path && path !== '') ? (
      <div className="s-img">
        <OverlayTrigger delayShow={1000} trigger={['hover']} placement="top" rootClose onHide={null} overlay={pop}>
          <img className="generic_grid_img" src={path} alt="" />
        </OverlayTrigger>
        <div className="del_btn">
          <OverlayTrigger delayShow={1000} placement="top" overlay={<Tooltip id={uuid.v4()}>remove this molecule</Tooltip>}>
            <Button className="btn_del" bsSize="xsmall" onClick={() => onDrop({}, params)} ><i className="fa fa-trash-o" aria-hidden="true" /></Button>
          </OverlayTrigger>
        </div>
      </div>
    ) : (<div className="data" style={{ width: '4vw' }}>{txt}</div>));
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
  return (<span className={`icon-${iconClass} indicator`} style={{ width: '4vw' }} />);
};

const show = (opt, iconClass, onDrop) => {
  if (opt.type === 'table') {
    const sField = opt.sField || {};
    const subVal = opt.data[sField.id];
    const { data } = opt;
    return base(subVal, iconClass, onDrop, { sField, data });
  }
  return base(opt, iconClass);
};

const source = (type, props, id) => {
  let isAssoc = false;
  const taggable = (props && props.tag && props.tag.taggable_data) || {};
  if (taggable.element && taggable.element.id === id) {
    isAssoc = false;
  } else {
    isAssoc = !!(taggable.reaction_id || taggable.wellplate_id || taggable.element);
  }

  switch (type) {
    case 'molecule':
      return {
        el_id: props.molecule.id,
        el_type: 'molecule',
        el_label: props.molecule.cano_smiles || props.molecule_formula || props.molecule_name_label,
        el_inchikey: props.molecule.inchikey,
        el_smiles: props.molecule.cano_smiles,
        el_iupac: props.molecule.iupac_name,
        el_molecular_weight: props.molecule.molecular_weight
        // el_tip: `${props.molecule.inchikey}@@${props.molecule.cano_smiles}`,
      };
    case 'sample':
      return {
        el_id: props.id,
        is_new: true,
        cr_opt: isAssoc == true ? 1 : 0,
        isAssoc,
        el_type: 'sample',
        el_label: props.short_label,
        el_tip: props.short_label,
      };
    default:
      return {
        el_id: props.id,
        is_new: true,
        cr_opt: 0,
        el_type: props.type,
        el_label: props.short_label,
        el_tip: props.short_label,
      };
  }
};

const dropTarget = {
  drop(targetProps, monitor) {
    const sourceProps = monitor.getItem().element;
    let type = targetProps.opt.type.split('_')[1];
    if (targetProps.opt.type === 'table') type = 'molecule';
    const sourceTag = source(type, sourceProps, targetProps.opt.id);
    targetProps.onDrop(sourceTag, targetProps.opt);
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

class GenericElTableDropTarget extends Component {
  render() {
    const {
      connectDropTarget, isOver, canDrop, opt, onDrop
    } = this.props;
    const iconClass = (opt.dndItems && opt.dndItems[0] === 'molecule' ? 'sample' : opt.dndItems[0]);
    const className = `target${isOver ? ' is-over' : ''}${canDrop ? ' can-drop' : ''}`;
    return connectDropTarget(<div className={className} style={{ display: 'inline-flex', justifyContent: 'center' }}>{show(opt, iconClass, onDrop)}</div>);
  }
}

export default
DropTarget(props => props.opt.dndItems, dropTarget, dropCollect)(GenericElTableDropTarget);

GenericElTableDropTarget.propTypes = {
  connectDropTarget: PropTypes.func.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
  opt: PropTypes.object.isRequired,
  onDrop: PropTypes.func
};

GenericElTableDropTarget.defaultProps = { onDrop: () => {} };
