import React from 'react';
import PropTypes from 'prop-types';
import {
  Form, Button
} from 'react-bootstrap';
import uuid from 'uuid';

import AppModal from 'src/components/common/AppModal';
import ClipboardActions from 'src/stores/alt/actions/ClipboardActions';
import CollectionSelect from 'src/components/common/CollectionSelect';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import DetailCardButton from 'src/apps/mydb/elements/details/DetailCardButton';

const Notification = (props) => (
  NotificationActions.add({
    title: props.title,
    message: props.msg,
    level: props.lvl,
    position: 'tc',
    dismissible: 'button',
    uid: uuid.v4()
  })
);

export default class CopyElementModal extends React.Component {
  constructor(props) {
    super(props);

    // Determine default collection (full object, since CollectionSelect expects objects)
    const { currentCollection } = UIStore.getState();
    const defCol = currentCollection && currentCollection.is_shared === false
      && currentCollection.is_locked === false && currentCollection.label !== 'All'
      ? currentCollection : null;

    this.state = {
      showModal: false,
      selectedCol: defCol,
      showAmountsConfirm: false
    };
    this.handleModalClose = this.handleModalClose.bind(this);
    this.handleModalShow = this.handleModalShow.bind(this);
    this.onColSelectChange = this.onColSelectChange.bind(this);
    this.copyElement = this.copyElement.bind(this);
    this.handleAmountsConfirm = this.handleAmountsConfirm.bind(this);
    this.handleAmountsConfirmClose = this.handleAmountsConfirmClose.bind(this);
  }

  handleModalShow() {
    this.setState({ showModal: true });
  }

  handleModalClose() {
    this.setState({ showModal: false });
  }

  handleAmountsConfirm(keepAmounts) {
    const { selectedCol } = this.state;
    const { element } = this.props;
    const colId = selectedCol?.id ?? selectedCol;
    this.setState({ showAmountsConfirm: false });
    ElementActions.copyReaction(element, colId, keepAmounts);
  }

  handleAmountsConfirmClose() {
    this.setState({ showAmountsConfirm: false });
  }

  onColSelectChange(e) {
    this.setState({ selectedCol: e });
  }

  copyElement() {
    const { selectedCol } = this.state;
    const { element } = this.props;
    if (selectedCol == null) {
      Notification({ title: 'Collection can not be empty', lvl: 'error', msg: 'Collection can not be empty' });
      return false;
    }

    const colId = selectedCol?.id ?? selectedCol;

    if (element.type === 'sample') {
      ClipboardActions.fetchElementAndBuildCopy(element, colId, 'copy_sample');
    } else if (element.type === 'reaction') {
      // Show amounts confirmation modal instead of proceeding directly
      this.setState({ showModal: false, showAmountsConfirm: true });
      return true;
    } else if (element.type === 'research_plan') {
      ElementActions.copyResearchPlan(element, colId);
    } else if (element.type === 'device_description') {
      ClipboardActions.fetchDeviceDescriptionAndBuildCopy(element, colId);
    } else if (element.type === 'cell_line') {
      ElementActions.copyCellLineFromId(element.id, colId);
    } else if (element.type === 'sequence_based_macromolecule_sample') {
      ClipboardActions.fetchSequenceBasedMacromoleculeSamplesAndBuildCopy(element, colId);
    } else {
      ElementActions.copyElement(element, colId);
    }

    this.setState({ showModal: false });
    return true;
  }

  render() {
    const { element } = this.props;
    const { showModal, selectedCol, showAmountsConfirm } = this.state;

    // Don't render if element can't be copied or is new
    if (!element.can_copy || element.isNew) return null;

    return (
      <>
        <DetailCardButton onClick={this.handleModalShow} iconClass="fa fa-clone" label="Copy" />

        <AppModal
          show={showModal}
          onHide={this.handleModalClose}
          title="Copy"
          closeLabel="Close"
          primaryActionLabel="Copy"
          onPrimaryAction={this.copyElement}
        >
          <Form.Label>Copy to Collection</Form.Label>
          <CollectionSelect
            value={selectedCol}
            withShared={false}
            onChange={this.onColSelectChange}
          />
        </AppModal>

        <AppModal
          show={showAmountsConfirm}
          onHide={this.handleAmountsConfirmClose}
          animation={false}
          title="Include Real Amounts?"
          primaryActionLabel="Include"
          onPrimaryAction={() => this.handleAmountsConfirm(true)}
          extendedFooter={(
            <Button variant="secondary" onClick={() => this.handleAmountsConfirm(false)}>
              Omit
            </Button>
          )}
        >
          <div>
            <p>
              Target amounts of the starting and reactant materials will be copied by default.
              Real amounts can also be included for starting materials, reactants, and solvents.
              Product material amounts cannot be copied.
            </p>
            <p className="mb-0">Include the real amounts in your copy?</p>
          </div>
        </AppModal>
      </>
    );
  }
}

CopyElementModal.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  element: PropTypes.object.isRequired
};
