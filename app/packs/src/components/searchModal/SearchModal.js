import React, { useState, Suspense, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonToolbar, Modal, FormGroup } from 'react-bootstrap';
import Draggable from "react-draggable";
import Select from 'react-select';
import UserStore from 'src/stores/alt/stores/UserStore';
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

const SearchModal = ({ isPublic }) => {
  const [selectedOption, setSelectedOption] = useState(FormData.forms[0]);
  const [minimizeModal, setMinimizeModal] = useState(true);
  const searchResultsStore = useContext(StoreContext).searchResults;

  const FormComponent = (block) => {
    if (typeof Components[block.component] !== "undefined") {
      return React.createElement(Components[block.component], {
        key: block.value,
        handleCancel: handleCancel,
        isPublic: isPublic
      });
    }
    return React.createElement(Components['empty'], {
      key: 'empty'
    });
  };

  const SearchPulldown = (props) => {
    const { onChange, selected } = props;
    const formOptions = FormData.forms.map((option) => option);

    return (
      <FormGroup>
        <Select
          className="status-select"
          name="search selection"
          clearable={false}
          value={selected}
          options={formOptions}
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

  const handleCancel = () => {
    searchResultsStore.hideSearchResults();
    searchResultsStore.clearSearchResults();
  }

  const handleMinimize = () => {
    setMinimizeModal(current => !current)
  }

  const handleSearchPulldownSelection = (e) => {
    setSelectedOption(FormData.forms[e.id]);
    searchResultsStore.clearSearchResults();
    setMinimizeModal(true);
  }

  let minimizedClass = minimizeModal ? '' : ' minimized';

  return (
    <Draggable handle=".handle">
      <Modal
        show={searchResultsStore.searchModalVisible}
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
            <i className="fa fa-window-minimize window-minimize" onClick={handleMinimize} />
          </div>
        </Modal.Header>
        <Modal.Body>
          <React.Suspense fallback={<Spinner />}>
            <div className={`form-container${minimizedClass}`}>
              {FormComponent(selectedOption)}
            </div>
          </React.Suspense>
        </Modal.Body>
      </Modal>
    </Draggable>
  );
}

export default observer(SearchModal);
