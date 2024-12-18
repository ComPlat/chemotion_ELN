import React, { Component } from 'react';
import {
  Col, Container, Form, InputGroup, Button, Overlay, OverlayTrigger, Row, Tooltip
} from 'react-bootstrap';
import PropTypes from 'prop-types';

import QuillEditor from 'src/components/QuillEditor';
import WellplateSizeDropdown from 'src/apps/mydb/elements/details/wellplates/propertiesTab/WellplateSizeDropdown';

import Wellplate from 'src/models/Wellplate';
import ConfirmModal from 'src/components/common/ConfirmModal'

export default class WellplateProperties extends Component {
  constructor(props) {
    super(props);
    this.deleteButtonRefs = [];
    this.state = {
      selectedReadoutIndex: null
    };
  }

  handleInputChange(type, event) {
    const { changeProperties } = this.props;
    const { value } = event.target;
    changeProperties({ type, value });
  }

  addReadoutTitle() {
    const { readoutTitles, changeProperties, handleAddReadout } = this.props;
    const currentTitles = readoutTitles || [];
    const newTitles = currentTitles.concat(`Readout ${currentTitles.length + 1}`);
    changeProperties({ type: 'readoutTitles', value: newTitles });
    handleAddReadout();
  }

  deleteReadoutTitle(index) {
    const { readoutTitles, changeProperties, handleRemoveReadout } = this.props;
    const currentTitles = readoutTitles || [];
    currentTitles.splice(index, 1);
    changeProperties({ type: 'readoutTitles', value: currentTitles });
    handleRemoveReadout(index);
    this.hideDeleteReadoutTitleConfirm(index);
  }

  updateReadoutTitle(index, newValue) {
    const { readoutTitles, changeProperties } = this.props;
    const currentTitles = readoutTitles || [];
    currentTitles[index] = newValue;
    changeProperties({ type: 'readoutTitles', value: currentTitles });
  }

  render() {
    const {
      readoutTitles, wellplate, changeProperties
    } = this.props;
    const { name, description } = wellplate;
    const { selectedReadoutIndex } = this.state;
    const showDeletionConfirmationModal = selectedReadoutIndex != null;

    return (
      <div className="mt-2">
        <ConfirmModal
          showModal={showDeletionConfirmationModal}
          title={"Delete Readout Title"}
          content={"Delete Readout Title? This will also delete the respective well readouts."}
          onClick={(deletionConfirmed) => {
            if (deletionConfirmed) this.deleteReadoutTitle(this.state.selectedReadoutIndex)
            this.setState({selectedReadoutIndex: null})
          }}
        />
        <Row className="">
          <Col xs="9">
            <Form.Group>
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                value={name || ''}
                onChange={(event) => this.handleInputChange('name', event)}
                disabled={name === '***'}
              />
            </Form.Group>
          </Col>
          <Col xs="3">
            <Form.Label>Size</Form.Label>
            <div className="custom-size-dropdown">
              <WellplateSizeDropdown
                updateWellplate={changeProperties}
                wellplate={wellplate}
              />
            </div>
          </Col>
        </Row>

        <Row className="gy-1 mt-3">
          <Form.Label>Readouts</Form.Label>
          {readoutTitles && readoutTitles.map((readoutTitle, index) => (
            <InputGroup key={`wellplate-${wellplate.id}-readout-${index}`}>
              <Form.Control
                type="text"
                value={readoutTitle}
                onChange={(event) => this.updateReadoutTitle(index, event.target.value)}
              />
              <Button variant="danger" onClick={() => this.setState({selectedReadoutIndex: index})}>
                <i className="fa fa-trash-o" />
              </Button>
            </InputGroup>
          ))}
          <Button variant="success" className="mt-2 mx-3 w-auto" onClick={() => this.addReadoutTitle()}>
            Add Readouts
          </Button>
        </Row>

        <Row className="mt-3">
          <Form.Group>
            <Form.Label>Description</Form.Label>
            <QuillEditor
              value={description}
              onChange={(event) => this.handleInputChange('description', { target: { value: event } })}
              disabled={description === '***'}
            />
          </Form.Group>
        </Row>
      </div>
    );
  }
}

WellplateProperties.propTypes = { /* eslint-disable react/forbid-prop-types */
  wellplate: PropTypes.instanceOf(Wellplate).isRequired,
  changeProperties: PropTypes.func.isRequired,
  handleAddReadout: PropTypes.func.isRequired,
  handleRemoveReadout: PropTypes.func.isRequired,
  readoutTitles: PropTypes.array.isRequired
};
