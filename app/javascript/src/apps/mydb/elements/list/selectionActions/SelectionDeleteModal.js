import React from 'react';
import PropTypes from 'prop-types';
import { Form } from 'react-bootstrap';

import AppModal from 'src/components/common/AppModal';
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
      <AppModal
        show
        onHide={onHide}
        title="Delete from all Collections?"
        primaryActionLabel="Delete"
        onPrimaryAction={this.handleClick}
      >
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
        </Form>
      </AppModal>
    );
  }
}

SelectionDeleteModal.propTypes = {
  onHide: PropTypes.func.isRequired,
};
