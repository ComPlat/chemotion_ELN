import React from 'react';
import PropTypes from 'prop-types';
import { Form, Button, ButtonToolbar, Modal } from 'react-bootstrap';

import ElementActions from 'src/stores/alt/actions/ElementActions';

export default class SelectionDeleteModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      deleteSubsamples: false,
    };

    this.handleCheck = this.handleCheck.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick() {
    const { onHide } = this.props;
    ElementActions.deleteElements(this.state);
    onHide();
  }

  handleCheck() {
    const { deleteSubsamples } = this.state;

    this.setState({
      deleteSubsamples: !deleteSubsamples,
    });
  }

  render() {
    const { deleteSubsamples } = this.state;
    const { onHide } = this.props;

    return (
      <Modal show centered onHide={onHide}>
        <Modal.Header closeButton>
          <Modal.Title>Delete from all Collections?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                onChange={this.handleCheck}
                checked={deleteSubsamples}
                label="Also delete reaction associated samples&nbsp;"
              />
              <Form.Text>
                If left unchecked, only the solvent and reactant samples of the selected reactions will be deleted
              </Form.Text>
            </Form.Group>

            <ButtonToolbar>
              <Button variant="primary" onClick={onHide}>Cancel</Button>
              <Button variant="warning" onClick={this.handleClick}>Delete</Button>
            </ButtonToolbar>
          </Form>
        </Modal.Body>
      </Modal>
    );
  }
}

SelectionDeleteModal.propTypes = {
  onHide: PropTypes.func.isRequired,
};
