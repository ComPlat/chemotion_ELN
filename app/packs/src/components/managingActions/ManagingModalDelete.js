import React from 'react';
import PropTypes from 'prop-types';
import { Form, Button, ButtonToolbar } from 'react-bootstrap';

export default class ManagingModalDelete extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      deleteSubsamples: false,
    };

    this.handleCheck = this.handleCheck.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.onHide = this.onHide.bind(this);
  }

  handleClick() {
    const { onHide, action } = this.props;
    action(this.state);
    onHide();
  }

  handleCheck() {
    const { deleteSubsamples } = this.state;

    this.setState({
      deleteSubsamples: !deleteSubsamples,
    });
  }

  onHide() {
    const { onHide } = this.props;
    onHide();
  }

  render() {
    const { deleteSubsamples } = this.state;

    return (
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
          <Button variant="primary" onClick={this.onHide}>Cancel</Button>
          <Button variant="warning" onClick={this.handleClick}>Delete</Button>
        </ButtonToolbar>
      </Form>
    );
  }
}

ManagingModalDelete.propTypes = {
  action: PropTypes.func.isRequired,
  onHide: PropTypes.func.isRequired,
};
