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
        title="Remove from all Collections?"
        primaryActionLabel="Remove"
        onPrimaryAction={this.handleClick}
      >
        <Form>
          <p>
            Removes the selection from all of your collections. An element that is not present in
            anyone else&apos;s collection is then permanently deleted; one still shared into another
            user&apos;s collection is only removed from your view.
          </p>
          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              onChange={this.handleCheck}
              checked={deleteSubsamples}
              label="Also remove reaction associated samples&nbsp;"
            />
            <Form.Text>
              If left unchecked, only the solvent and reactant samples of the selected reactions will be removed
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
