import React, { useState, Suspense, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  ButtonToolbar,
  Modal,
  FormGroup
} from 'react-bootstrap';
import Draggable from "react-draggable";
import Select from 'react-select';
import UserStore from 'src/stores/alt/stores/UserStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

import FormData from './FormData';
import AdvancedSearchForm from './forms/AdvancedSearchForm';
import KetcherRailsForm from './forms/KetcherRailsForm';
import NoFormSelected from './forms/NoFormSelected';

const Components = {
  advanced: AdvancedSearchForm,
  ketcher: KetcherRailsForm,
  empty: NoFormSelected
}

const SearchModal = ({ showModal, onCancel, molfile, currentState, isPublic }) => {
  const [selectedOption, setSelectedOption] = useState({ value: 'advanced', label: 'Advanced Search' });
  const [visibleModal, setVisibleModal] = useState(showModal);
  const [view, setView] = useState();
  const selectOptions = FormData.forms.map((option) => ({ id: option.id, value: option.value, label: option.label }));
  const searchResultsStore = useContext(StoreContext).searchResults;

  useEffect(() => {
    const defaultForm = React.createElement(Components['advanced'], { key: 'advanced', handleCancel: handleCancel, currentState: currentState });
    setView(defaultForm);
  }, []);

  const FormComponent = (block) => {
    if (typeof Components[block.component] !== "undefined") {
      return React.createElement(Components[block.component], {
        key: block.value,
        molfile: molfile,
        handleCancel: handleCancel,
        currentState: currentState,
        isPublic: isPublic
      });
    }
    return React.createElement(
      () => <div>The component {block.component} has not been created yet.</div>,
      { key: block.value }
    );
  };

  const SearchPulldown = (props) => {
    const { onChange, selected } = props;

    return (
      <FormGroup>
        <Select
          className="status-select"
          name="search selection"
          clearable={false}
          value={selected}
          options={selectOptions}
          onChange={onChange}
        />
      </FormGroup>
    );
  };

  const Spinner = () => {
    return (
      <i className="fa fa-spinner fa-pulse fa-3x fa-fw" />
    );
  }

  const hideModal = () => {
    setVisibleModal(false);
  }

  const handleCancel = () => {
    hideModal();
    searchResultsStore.clearSearchResults();
    if (onCancel) { onCancel(); }
  }

  const handleSearchPulldownSelection = (e) => {
    setSelectedOption({ value: e.value, label: e.label });
    setView(FormComponent(FormData.forms[e.id]));
    if (searchResultsStore.searchResultsCount > 0) {
      searchResultsStore.clearSearchResults();
    }
  }

  return (
    <Draggable handle=".handle">
      <Modal
        show={showModal}
        onHide={handleCancel}
        backdrop={false}
        dialogas="full-search"
        dialogClassName="searching"
      >
        <Modal.Header className="handle" closeButton>
          <div className="col-md-8 col-sm-6">
            <Modal.Title>
              <i className="fa fa-arrows move" />
              Please select your search criteria
            </Modal.Title>
          </div>
          <div className="col-md-3 col-sm-5">
            <SearchPulldown
              onChange={handleSearchPulldownSelection}
              selected={selectedOption}
            />
          </div>
          <div className="col-md-1 col-sm-1">
            <i className="fa fa-window-minimize window-minimize" />
          </div>
        </Modal.Header>
        <Modal.Body>
          <React.Suspense fallback={<Spinner />}>
            <div className="form-container">
              {view}
            </div>
          </React.Suspense>
        </Modal.Body>
      </Modal>
    </Draggable>
  );
}

export default observer(SearchModal);
