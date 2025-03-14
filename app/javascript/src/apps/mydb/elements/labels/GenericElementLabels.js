import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import UserStore from 'src/stores/alt/stores/UserStore';

export default class GenericElementLabels extends React.Component {
  constructor(props) {
    super(props);
    this.state = { showWarning: false, clicked: false };
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
    if (this.state.showWarning !== state.elementWarning) {
      this.setState({ showWarning: state.elementWarning });
    }
  }

  closeWarning() {
    this.setState({ showWarning: false });
    ElementActions.closeWarning();
  }

  handleOnClick(e) {
    const { element } = this.props;
    const elInfo = element.tag.taggable_data.element || {};
    ElementActions.tryFetchGenericElById(elInfo.id);
    this.setState({ clicked: true });
    e.stopPropagation();
  }

  render() {
    const { element } = this.props;
    if (!element.tag || !element.tag.taggable_data || !element.tag.taggable_data.element) {
      return null;
    }
    const elInfo = element.tag.taggable_data.element;
    const klasses = UserStore.getState().genericEls;
    const klass = (klasses && klasses.find(el => el.name === elInfo.type)) || {};
    const { showWarning, clicked } = this.state;
    return (
      <>
        <i className={`${klass.icon_name}`} onClick={this.handleOnClick} key={element.id} />
        <Modal centered show={showWarning && clicked} onHide={this.closeWarning}>
          <Modal.Header closeButton>
            <Modal.Title>No Access to Element</Modal.Title>
          </Modal.Header>
          <Modal.Body>Sorry, you cannot access this Element.</Modal.Body>
          <Modal.Footer>
            <Button onClick={this.closeWarning}>Close</Button>
          </Modal.Footer>
        </Modal>
      </>
    );
  }
}
