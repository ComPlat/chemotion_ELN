import React from 'react';
import PropTypes from 'prop-types';
import JSONInput from 'react-json-editor-ajrm';
import { Form, FormGroup, Modal, Button, ButtonGroup } from 'react-bootstrap';

export default class TemplateJsonModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      properties_template: null,
      isValidJson: false
    };

    this.onChangeJson = this.onChangeJson.bind(this);
    this.reloadJson = this.reloadJson.bind(this);
    this.handleUpdateJson = this.handleUpdateJson.bind(this);
  }

  onChangeJson(e) {
    let { properties_template } = this.state;
    if (e.error === false) {
      properties_template = e.jsObject;
      this.setState({
        properties_template,
        isValidJson: false,
      });
    } else {
      this.setState({
        isValidJson: true,
      });
    }
  }

  reloadJson() {
    this.setState({
      properties_template: null,
      isValidJson: false,
    });
  }

  handleUpdateJson() {
    const { properties_template } = this.state;
    this.props.fnUpdate(properties_template);
    this.setState({
      properties_template: null,
      isValidJson: false
    });
  }

  handleCloseJson() {
    this.setState({
      properties_template: null,
      isValidJson: false
    });
    this.props.fnClose();
  }

  render() {
    const { showModal, fnClose, element } = this.props;
    let { properties_template, isValidJson } = this.state;
    return (
      <Modal backdrop="static" dialogClassName="importChemDrawModal" show={showModal} onHide={() => fnClose()}>
        <Modal.Header closeButton><Modal.Title>Template in JSON format</Modal.Title></Modal.Header>
        <Modal.Body style={{ overflow: 'auto' }}>
          <div className="col-md-12">
            <Form horizontal>
              <FormGroup>
                <JSONInput
                  placeholder={properties_template || element.properties_template}
                  width="100%"
                  height="800px"
                  onChange={e => this.onChangeJson(e)}
                />

              </FormGroup>
              <FormGroup>
                <ButtonGroup>
                  <Button bsStyle="default" onClick={() => fnClose()}>Close&nbsp;<i className="fa fa-times" aria-hidden="true" /></Button>
                  <Button bsStyle="info" onClick={() => this.reloadJson()}>Reset&nbsp;<i className="fa fa-repeat" aria-hidden="true" /></Button>
                  <Button bsStyle="warning" disabled={isValidJson} onClick={() => this.handleUpdateJson()}>Save&nbsp;<i className="fa fa-floppy-o" aria-hidden="true" /></Button>
                </ButtonGroup>
              </FormGroup>
            </Form>
          </div>
        </Modal.Body>
      </Modal>
    );
  }
};

TemplateJsonModal.propTypes = {
  showModal: PropTypes.bool.isRequired,
  fnClose: PropTypes.func.isRequired,
  fnUpdate: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  element: PropTypes.object.isRequired,
};
