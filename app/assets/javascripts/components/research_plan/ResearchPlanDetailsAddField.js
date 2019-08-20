import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Button } from 'react-bootstrap'

export default class ResearchPlanDetailsAddField extends Component {

  render() {
    const { onAdd } = this.props

    return (
      <div className="add-field">
        <Button bsStyle="primary" bsSize="small" onClick={() => onAdd('richtext')} >
          <i className="fa fa-file-text-o"></i>&nbsp;<i className="fa fa-plus"></i>
        </Button>
        <Button bsStyle="primary" bsSize="small" onClick={() => onAdd('table')} >
          <i className="fa fa-table"></i>&nbsp;<i className="fa fa-plus"></i>
        </Button>
        <Button bsStyle="primary" bsSize="small" onClick={() => onAdd('ketcher')} >
          <i className="fa fa-flask"></i>&nbsp;<i className="fa fa-plus"></i>
        </Button>
        <Button bsStyle="primary" bsSize="small" onClick={() => onAdd('image')} >
          <i className="fa fa-picture-o"></i>&nbsp;<i className="fa fa-plus"></i>
        </Button>
        <Button bsStyle="primary" bsSize="small" onClick={() => onAdd('sample')} >
          <i className="icon-sample"></i>&nbsp;<i className="fa fa-plus"></i>
        </Button>
        <Button bsStyle="primary" bsSize="small" onClick={() => onAdd('reaction')} >
          <i className="icon-reaction"></i>&nbsp;<i className="fa fa-plus"></i>
        </Button>
      </div>
    )
  }
}

ResearchPlanDetailsAddField.propTypes = {
  onAdd: PropTypes.func,
}
