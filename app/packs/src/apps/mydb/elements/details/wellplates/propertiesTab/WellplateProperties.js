import React, { Component } from 'react';
import {
  Form, FormGroup, InputGroup, Button, Overlay, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import PropTypes from 'prop-types';

import QuillEditor from 'src/components/QuillEditor';
import WellplateSizeDropdown from 'src/apps/mydb/elements/details/wellplates/propertiesTab/WellplateSizeDropdown';
import CustomSizeModal from 'src/apps/mydb/elements/details/wellplates/propertiesTab/CustomSizeModal';
import Wellplate from 'src/models/Wellplate';
import ConfirmModal from 'src/components/common/ConfirmModal'

export default class WellplateProperties extends Component {
  constructor(props) {
    super(props);
    this.deleteButtonRefs = [];
    this.state = {
      showCustomSizeModal: false,
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

  showCustomSizeModal() {
    this.setState({ showCustomSizeModal: true });
  }

  render() {
    const {
      readoutTitles, wellplate, changeProperties
    } = this.props;

    const { name, description } = wellplate;

    const { showCustomSizeModal, selectedReadoutIndex } = this.state;
    const showDeletionConfirmationModal = selectedReadoutIndex != null;
    return (
      <div>
        <CustomSizeModal
          showCustomSizeModal={showCustomSizeModal}
          wellplate={wellplate}
          triggerUIUpdate={changeProperties}
          handleClose={() => { this.setState({ showCustomSizeModal: false }); }}
        />
        <ConfirmModal
          showModal={showDeletionConfirmationModal}
          title={"Delete Readout Title"}
          content={"Delete Readout Title? This will also delete the respective well readouts."}
          onClick={(deletionConfirmed) => {
            if (deletionConfirmed) this.deleteReadoutTitle(this.state.selectedReadoutIndex)
            this.setState({selectedReadoutIndex: null})
          }}
        />

        <table width="100%">
          <tbody>
            <tr>
              <td width="70%" className="padding-right">
                <FormGroup>
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={name || ''}
                    onChange={(event) => this.handleInputChange('name', event)}
                    disabled={name === '***'}
                  />
                </FormGroup>
              </td>
              <td width="30%">
                <div>Size</div>
                <div className="custom-size-dropdown">
                  <WellplateSizeDropdown
                    triggerUIUpdate={changeProperties}
                    wellplate={wellplate}
                  />
                </div>
                <OverlayTrigger
                  placement="top"
                  overlay={<Tooltip id="create-custom-tooltip-id">Create custom wellplate size</Tooltip>}
                >
                  <Button
                    className="create-own-size-button"
                    disabled={!wellplate.is_new}
                    onClick={() => this.showCustomSizeModal()}
                  >
                    <i className="fa fa-braille" />
                  </Button>
                </OverlayTrigger>
              </td>
            </tr>

            <tr>
              <td colSpan={2}>
                <Form.Label>Readouts</Form.Label>
              </td>
            </tr>

            {readoutTitles && readoutTitles.map((readoutTitle, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <tr key={index}>
                <td colSpan={2}>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      value={readoutTitle}
                      onChange={(event) => this.updateReadoutTitle(index, event.target.value)}
                    />
                    <Button variant="danger" onClick={() => this.setState({selectedReadoutIndex: index})}>
                      <i className="fa fa-trash-o" />
                    </Button>
                  </InputGroup>
                </td>
              </tr>
            ))}

            <tr>
              <td colSpan={2}>
                <Button variant="success" onClick={() => this.addReadoutTitle()}>
                  Add Readouts
                </Button>
              </td>
            </tr>

            <tr>
              <td colSpan="2">
                <FormGroup>
                  <Form.Label>Description</Form.Label>
                  <QuillEditor
                    value={description}
                    onChange={(event) => this.handleInputChange('description', { target: { value: event } })}
                    disabled={description === '***'}
                  />
                </FormGroup>
              </td>
            </tr>
          </tbody>
        </table>
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
