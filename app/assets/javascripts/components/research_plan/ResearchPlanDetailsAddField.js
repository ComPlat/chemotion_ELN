import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Tooltip, OverlayTrigger } from 'react-bootstrap';

// eslint-disable-next-line react/prefer-stateless-function
export default class ResearchPlanDetailsAddField extends Component {
  render() {
    const { onAdd } = this.props;
    return (
      <div className="research-plan-field-drop-add-field">
        <OverlayTrigger placement="top" overlay={<Tooltip id="rp_richtext">Add Text Editor</Tooltip>}>
          <Button bsStyle="primary" bsSize="small" onClick={() => onAdd('richtext')} >
            <i className="fa fa-file-text-o" aria-hidden="true" />&nbsp;<i className="fa fa-plus" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="top" overlay={<Tooltip id="rp_table">Add Table Editor</Tooltip>}>
          <Button bsStyle="primary" bsSize="small" onClick={() => onAdd('table')} >
            <i className="fa fa-table" aria-hidden="true" />&nbsp;<i className="fa fa-plus" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="top" overlay={<Tooltip id="rp_ketcher">Add Ketcher Editor</Tooltip>}>
          <Button bsStyle="primary" bsSize="small" onClick={() => onAdd('ketcher')} >
            <i className="fa fa-pencil-square-o" aria-hidden="true" />&nbsp;<i className="fa fa-plus" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="top" overlay={<Tooltip id="rp_image">Add Image</Tooltip>}>
          <Button bsStyle="primary" bsSize="small" onClick={() => onAdd('image')} >
            <i className="fa fa-picture-o" aria-hidden="true" />&nbsp;<i className="fa fa-plus" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="top" overlay={<Tooltip id="rp_sample">Add Sample</Tooltip>}>
          <Button bsStyle="primary" bsSize="small" onClick={() => onAdd('sample')} >
            <i className="icon-sample" aria-hidden="true" />&nbsp;<i className="fa fa-plus" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="top" overlay={<Tooltip id="rp_reaction">Add Reaction</Tooltip>}>
          <Button bsStyle="primary" bsSize="small" onClick={() => onAdd('reaction')} >
            <i className="icon-reaction" aria-hidden="true" />&nbsp;<i className="fa fa-plus" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
      </div>
    );
  }
}

ResearchPlanDetailsAddField.propTypes = {
  onAdd: PropTypes.func,
};
