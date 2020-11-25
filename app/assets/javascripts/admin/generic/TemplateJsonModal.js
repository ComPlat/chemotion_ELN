import React from 'react';
import PropTypes from 'prop-types';
import JSONInput from 'react-json-editor-ajrm';
import { Form, FormGroup, Modal, Button } from 'react-bootstrap';

export default class TemplateJsonModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      propertiesTemplate: props.element.properties_template,
      isValidJson: false
    };
    this.onChangeJson = this.onChangeJson.bind(this);
    this.resetJson = this.resetJson.bind(this);
    this.handleUpdateJson = this.handleUpdateJson.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.updateState = this.updateState.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (this.props.element.properties_template !== prevProps.element.properties_template) {
      this.updateState(this.props.element.properties_template, false);
    }
  }

  onChangeJson(e) {
    let { propertiesTemplate } = this.state;
    if (e.error === false) {
      propertiesTemplate = e.jsObject;
      this.updateState(propertiesTemplate, false);
    } else {
      this.setState({ isValidJson: true });
    }
  }

  updateState(template, isValid) {
    this.setState({ propertiesTemplate: template, isValidJson: isValid });
  }

  resetJson() {
    this.updateState(this.props.element.properties_template, false);
  }

  handleUpdateJson() {
    const { propertiesTemplate } = this.state;
    this.props.fnUpdate(propertiesTemplate);
  }

  handleClose() {
    this.updateState(this.props.element.properties_template, false);
    this.props.fnClose();
  }

  render() {
    const { showModal } = this.props;
    const { propertiesTemplate, isValidJson } = this.state;
    return (
      <Modal backdrop="static" dialogClassName="importChemDrawModal" show={showModal} onHide={() => this.handleClose()}>
        <Modal.Header closeButton><Modal.Title>Template in JSON format</Modal.Title></Modal.Header>
        <Modal.Body style={{ overflow: 'auto' }}>
          <div className="col-md-12">
            <Form horizontal>
              <FormGroup>
                <JSONInput
                  placeholder={propertiesTemplate}
                  width="100%"
                  height="800px"
                  onChange={e => this.onChangeJson(e)}
                />
              </FormGroup>
              <FormGroup>
                <Button bsStyle="default" onClick={() => this.handleClose()}>Close&nbsp;<i className="fa fa-times" aria-hidden="true" /></Button>&nbsp;
                <Button bsStyle="info" onClick={() => this.resetJson()}>Reset&nbsp;<i className="fa fa-repeat" aria-hidden="true" /></Button>&nbsp;
                <Button bsStyle="warning" disabled={isValidJson} onClick={() => this.handleUpdateJson()}>Save&nbsp;<i className="fa fa-floppy-o" aria-hidden="true" /></Button>
              </FormGroup>
            </Form>
          </div>
        </Modal.Body>
      </Modal>
    );
  }
}

TemplateJsonModal.propTypes = {
  showModal: PropTypes.bool.isRequired,
  fnClose: PropTypes.func.isRequired,
  fnUpdate: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  element: PropTypes.object.isRequired,
};
