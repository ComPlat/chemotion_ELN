import React from 'react';
import { Modal, Button } from 'react-bootstrap';

import ElementActions from 'src/stores/alt/actions/ElementActions';
import ElementStore from 'src/stores/alt/stores/ElementStore';

export default class ElementReactionLabels extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showWarning: false,
      clicked: false
    };
    let { element } = props;

    this.handleOnClick = this.handleOnClick.bind(this);
    this.closeWarning = this.closeWarning.bind(this);

    this.onStoreChange = this.onStoreChange.bind(this);
  }

  componentDidMount() {
    ElementStore.listen(this.onStoreChange);
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onStoreChange);
  }

  onStoreChange(state) {
    if (this.state.showWarning != state.elementWarning) {
      this.setState({
        showWarning: state.elementWarning
      });
    }
  }

  closeWarning() {
    this.setState({showWarning: false });
    ElementActions.closeWarning();
  }

  handleOnClick(e) {
    let { element } = this.props;

    ElementActions.tryFetchReactionById(element.tag.taggable_data.reaction_id);
    this.setState({ clicked: true });
    e.stopPropagation();
  }

  render() {
    let { element } = this.props;

    if (!element.tag || !element.tag.taggable_data ||
        !element.tag.taggable_data.reaction_id)
      return null;

    const { showWarning, clicked } = this.state;

    return (
      <>
        <Button variant="light" size="xxsm" onClick={this.handleOnClick} key={element.id}>
          <i className="icon-reaction"/>
        </Button>
        <Modal centered show={showWarning && clicked} onHide={this.closeWarning}>
          <Modal.Header closeButton>
            <Modal.Title>No Access to Element</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Sorry, you cannot access this Reaction.
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={this.closeWarning}>Close</Button>
          </Modal.Footer>
        </Modal>
      </>
    )
  }
}
