import React, { Component } from 'react';
import {
  FormGroup, InputGroup, FormControl, ControlLabel, Button, ButtonGroup, Overlay, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import PropTypes from 'prop-types';

import QuillEditor from 'src/components/QuillEditor';
import WellplateSizeDropdown from 'src/apps/mydb/elements/details/wellplates/propertiesTab/WellplateSizeDropdown.js';
import CustomSizeModal from 'src/apps/mydb/elements/details/wellplates/propertiesTab/CustomSizeModal';

export default class WellplateProperties extends Component {
  constructor(props) {
    super(props);
    this.deleteButtonRefs = [];
    this.state = { showDeleteReadoutConfirm: [], showCustomSizeModal: false };
  }

  showDeleteReadoutTitleConfirm(index) {
    const { showDeleteReadoutConfirm } = this.state;
    showDeleteReadoutConfirm[index] = true;
    this.setState({ showDeleteReadoutConfirm });
  }

  hideDeleteReadoutTitleConfirm(index) {
    const { showDeleteReadoutConfirm } = this.state;
    showDeleteReadoutConfirm[index] = false;
    this.setState({ showDeleteReadoutConfirm });
  }

  handleInputChange(type, event) {
    const { changeProperties } = this.props;
    const { value } = event.target;
    changeProperties({ type, value });
  }

  addReadoutTitle() {
    const { readoutTitles, changeProperties, handleAddReadout } = this.props;
    const currentTitles = readoutTitles || [];
    const newTitles = currentTitles.concat('Readout');
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

  renderDeleteReadoutTitleButton(index) {
    const { showDeleteReadoutConfirm } = this.state;
    const show = showDeleteReadoutConfirm[index];

    const confirmTooltip = (
      <Tooltip className="in" id="tooltip-bottom">
        Delete Readout Title? This will also delete the respective well readouts.
        <br />
        <ButtonGroup>
          <Button
            bsStyle="danger"
            bsSize="xsmall"
            onClick={() => this.deleteReadoutTitle(index)}
          >
            Yes
          </Button>
          <Button
            bsStyle="warning"
            bsSize="xsmall"
            onClick={() => this.hideDeleteReadoutTitleConfirm(index)}
          >
            No
          </Button>
        </ButtonGroup>
      </Tooltip>
    );

    return (
      <InputGroup.Button>
        <OverlayTrigger
          placement="top"
          overlay={<Tooltip id="delete_readout_title_tooltip">Delete Readout Title</Tooltip>}
        >
          <Button
            bsStyle="danger"
            className="button-right"
            ref={(ref) => { this.deleteButtonRefs[index] = ref; }}
            onClick={() => this.showDeleteReadoutTitleConfirm(index)}
          >
            <i className="fa fa-trash-o" />
          </Button>
        </OverlayTrigger>
        <Overlay
          show={show}
          placement="bottom"
          rootClose
          onHide={() => this.hideDeleteReadoutTitleConfirm(index)}
          target={this.deleteButtonRefs[index]}
        >
          { confirmTooltip }
        </Overlay>
      </InputGroup.Button>
    );
  }

  render() {
    const {
      name, size, description, readoutTitles, wellplate
    } = this.props;

    const { showCustomSizeModal } = this.state;

    return (
      <div>
        <CustomSizeModal
          showCustomSizeModal={showCustomSizeModal}
          wellplate={wellplate}
          parent={this}
          handleClose={() => { this.setState({ showCustomSizeModal: false }); }}
        />
        <table width="100%">
          <tbody>
            <tr>
              <td width="70%" className="padding-right">
                <FormGroup>
                  <ControlLabel>Name</ControlLabel>
                  <FormControl
                    type="text"
                    value={name || ''}
                    onChange={(event) => this.handleInputChange('name', event)}
                    disabled={name === '***'}
                  />
                </FormGroup>
              </td>
              <td width="30%">
                <FormGroup>
                  <ControlLabel>Size</ControlLabel>
                  <WellplateSizeDropdown wellplate={wellplate} />
                  <OverlayTrigger
                    placement="top"
                    overlay={<Tooltip id="xxx">Create custom wellplate size</Tooltip>}
                  >
                    <Button
                      className="create-own-size-button"
                      onClick={() => this.showCustomSizeModal()}
                    >
                      <i className="fa fa-braille" />
                    </Button>
                  </OverlayTrigger>
                </FormGroup>
              </td>
            </tr>
            <tr>
              <td colSpan={2}>
                <ControlLabel>Readout Titles</ControlLabel>
              </td>
            </tr>
            {readoutTitles && readoutTitles.map((readoutTitle, index) => (
            // eslint-disable-next-line react/no-array-index-key
              <tr key={index}>
                <td colSpan={2}>
                  <FormGroup>
                    <InputGroup>
                      <FormControl
                        type="text"
                        value={readoutTitle}
                        onChange={(event) => this.updateReadoutTitle(index, event.target.value)}
                      />
                      { this.renderDeleteReadoutTitleButton(index) }
                    </InputGroup>
                  </FormGroup>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={2}>
                <OverlayTrigger placement="top" overlay={<Tooltip id="add_readout_title_tooltip">Add Readout Title</Tooltip>}>
                  <Button className="button-right" bsStyle="success" onClick={() => this.addReadoutTitle()}>
                    Add Readouts
                  </Button>
                </OverlayTrigger>
              </td>
            </tr>
            <tr>
              <td colSpan="2">
                <FormGroup>
                  <ControlLabel>Description</ControlLabel>
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
  wellplate: PropTypes.object.isRequired,
  changeProperties: PropTypes.func.isRequired,
  handleAddReadout: PropTypes.func.isRequired,
  handleRemoveReadout: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  size: PropTypes.number.isRequired,
  description: PropTypes.object.isRequired,
  readoutTitles: PropTypes.array.isRequired,
};
