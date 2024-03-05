import React from 'react';
import PropTypes from 'prop-types';
import {
  SplitButton, Button, ButtonToolbar, FormControl,
  FormGroup, ControlLabel, Modal, MenuItem
} from 'react-bootstrap';
import Aviator from 'aviator';

import { elementShowOrNew } from '../routesUtils';
import UIStore from '../stores/UIStore';
import UserStore from '../stores/UserStore';
import ElementActions from '../actions/ElementActions';
import ClipboardActions from '../actions/ClipboardActions';
import SamplesFetcher from '../fetchers/SamplesFetcher';
import MatrixCheck from '../common/MatrixCheck';

export default class CreateButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      samples: [],
      collectionId: null,
      modalProps: {
        show: false,
        sampleCount: 0,
        wellplateCount: 0
      }
    }

    this.createBtn = this.createBtn.bind(this);
  }

  getSampleFilter() {
    let uiState = UIStore.getState();
    return this.filterParamsFromUIStateByElementType(uiState, "sample");
  }

  getReactionId() {
    let uiState = UIStore.getState();
    return uiState.reaction.checkedIds.first();
  }

  isCopySampleDisabled() {
    let sampleFilter = this.getSampleFilter();
    return !sampleFilter.all && sampleFilter.included_ids.size == 0;
  }

  copySample() {
    let sampleFilter = this.getSampleFilter();

    // Set limit to 1 because we are only interested in one sample
    let params = {
      sample: sampleFilter,
      limit: 1
    }

    ClipboardActions.fetchSamplesByUIStateAndLimit(params, 'copy_sample');
  }

  isCopyReactionDisabled() {
    let reactionId = this.getReactionId();
    return !reactionId;
  }

  copyReaction() {
    let reactionId = this.getReactionId();
    ElementActions.copyReactionFromId(reactionId);
  }

  createWellplateFromSamples() {
    let uiState = UIStore.getState();
    let sampleFilter = this.filterParamsFromUIStateByElementType(uiState, "sample");

    let params = {
      sample: sampleFilter
    }

    SamplesFetcher.fetchSamplesByUIStateAndLimit(params).then((result) => {
      const samples = result;
      const sampleCount = samples.length;
      if (sampleCount <= 96) {
        ClipboardActions.fetchSamplesByUIStateAndLimit(params, 'template_wellplate');
      } else {
        const wellplateCount = Math.ceil(sampleCount / 96);

        this.setState({
          samples: samples,
          collectionId: sampleFilter.collection_id,
          modalProps: {
            show: true,
            sampleCount: sampleCount,
            wellplateCount: wellplateCount
          }
        });
      }
    });
  }

  handleModalHide() {
    this.setState({
      modalProps: {
        show: false
      }
    });
    // https://github.com/react-bootstrap/react-bootstrap/issues/1137
    document.body.className = document.body.className.replace('modal-open', '');
  }

  bulkCreateWellplates() {
    const wellplateCount = this.wellplateInput.value;
    const { collectionId, samples } = this.state;

    ElementActions.bulkCreateWellplatesFromSamples({
      collection_id: collectionId,
      samples: samples,
      wellplateCount: wellplateCount
    });
    this.handleModalHide();
  }

  createWellplateModal() {
    const { modalProps } = this.state;

    return (
      <Modal animation={false} show={modalProps.show} onHide={() => this.handleModalHide()}>
        <Modal.Header closeButton>
          <Modal.Title>Create Wellplates from Samples</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          You have selected {modalProps.sampleCount} samples. Please fill in the number of wellplates you would like to create.
          <p />
          <FormGroup controlId="wellplateInput">
            <ControlLabel>Number of wellplates</ControlLabel>
            <FormControl
              type="text"
              inputRef={(input) => { this.wellplateInput = input; }}
              defaultValue={modalProps.wellplateCount || ''}
            />
          </FormGroup>

          <ButtonToolbar>
            <Button bsStyle="primary" onClick={() => this.handleModalHide()}>Cancel</Button>
            <Button bsStyle="warning" onClick={() => this.bulkCreateWellplates()}>Submit</Button>
          </ButtonToolbar>
        </Modal.Body>
      </Modal>
    )
  }



  createScreenFromWellplates() {
    let uiState = UIStore.getState();
    let wellplateFilter = this.filterParamsFromUIStateByElementType(uiState, "wellplate");
    let params = {
      wellplate: wellplateFilter
    }
    ClipboardActions.fetchWellplatesByUIState(params, 'template_screen');
  }

  filterParamsFromUIStateByElementType(uiState, elementType) {
    let collectionId = uiState.currentCollection && uiState.currentCollection.id;

    return {
      all: uiState[elementType].checkedAll,
      included_ids: uiState[elementType].checkedIds,
      excluded_ids: uiState[elementType].uncheckedIds,
      collection_id: collectionId
    }
  }

  splitSelectionAsSubsamples() {
    ElementActions.splitAsSubsamples(UIStore.getState())
  }

  noSampleSelected() {
    const {sample} = UIStore.getState()
    return sample.checkedIds.size == 0 && sample.checkedAll == false
  }

  isAllCollection() {
    const {currentCollection} = UIStore.getState()
    return currentCollection && currentCollection.label == 'All'
  }

  createElementOfType(type) {
    const {currentCollection,isSync} = UIStore.getState();
    const uri = isSync
      ? `/scollection/${currentCollection.id}/${type}/new`
      : `/collection/${currentCollection.id}/${type}/new`;
    Aviator.navigate(uri, { silent: true} );
    const e = { type, params: { collectionID: currentCollection.id } };
    e.params[`${type}ID`] = 'new'
    const genericEls = (UserStore.getState() && UserStore.getState().genericEls) || [];
    if (genericEls.find(el => el.name == type)) {
      e.klassType = 'GenericEl';
    }
    elementShowOrNew(e);
  }

  createBtn(type) {
    let iconClass = `icon-${type}`;
    const genericEls = UserStore.getState().genericEls || [];

    const constEls = ['sample', 'reaction', 'screen', 'wellplate', 'research_plan'];
    if (!constEls.includes(type) && typeof genericEls !== 'undefined' && genericEls !== null && genericEls.length > 0) {
      const genericEl = (genericEls && genericEls.find(el => el.name == type)) || {};
      iconClass = `${genericEl.icon_name}`;
    }
    return (
      <div>
        <i className={`${iconClass}`}></i> &nbsp; <i className="fa fa-plus"></i>
      </div>
    )
  }

  noWellplateSelected() {
    const { wellplate } = UIStore.getState();
    return wellplate.checkedIds.size == 0 && wellplate.checkedAll == false;
  }

  splitSelectionAsSubwellplates() {
    ElementActions.splitAsSubwellplates(UIStore.getState());
  }

  render() {
    const { isDisabled, customClass } = this.props;
    const type = UserStore.getState().currentType;
    const elements = [
      { name: 'sample', label: 'Sample' },
      { name: 'reaction', label: 'Reaction' },
      { name: 'wellplate', label: 'Wellplate' },
      { name: 'screen', label: 'Screen' },
      { name: 'research_plan', label: 'Research Plan' }
    ];
    let genericEls = [];
    const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};

    if (MatrixCheck(currentUser.matrix, 'genericElement')) {
      genericEls = UserStore.getState().genericEls || [];
    }
    const itemTables = [];

    elements.concat(genericEls).forEach((el) => {
      itemTables.push(<MenuItem id={`create-${el.name}-button`} key={el.name} onSelect={() => this.createElementOfType(`${el.name}`)}>Create {el.label}</MenuItem>);
    });

    return (
      <div>
        <SplitButton
          id='create-split-button'
          bsStyle={customClass ? null : 'primary'}
          className={customClass}
          title={this.createBtn(type)}
          disabled={isDisabled}
          onClick={() => this.createElementOfType(type)}
        >
          {this.createWellplateModal()}
          {itemTables}
          <MenuItem divider />
          <MenuItem onSelect={() => this.createWellplateFromSamples()}>Create Wellplate from Samples</MenuItem>
          <MenuItem onSelect={() => this.createScreenFromWellplates()}>Create Screen from Wellplates</MenuItem>
          <MenuItem divider />
          <MenuItem onSelect={() => this.copySample()} disabled={this.isCopySampleDisabled()}>Copy Sample</MenuItem>
          <MenuItem onSelect={() => this.copyReaction()} disabled={this.isCopyReactionDisabled()}>Copy Reaction</MenuItem>
          <MenuItem onSelect={() => this.splitSelectionAsSubsamples()}
                    disabled={this.noSampleSelected() || this.isAllCollection()}>
            Split Sample
          </MenuItem>
          <MenuItem
            onSelect={() => this.splitSelectionAsSubwellplates()}
            disabled={this.noWellplateSelected() || this.isAllCollection()}
          >
            Split Wellplate
          </MenuItem>
        </SplitButton>
    </div>
    )
  }
}

CreateButton.propTypes = {
  customClass: PropTypes.string,
};

CreateButton.defaultProps = {
  customClass: null,
};
