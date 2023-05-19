import React, { useState, Suspense, useContext } from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonToolbar, Modal, FormGroup } from 'react-bootstrap';
import Draggable from "react-draggable";
import Select from 'react-select';
import UserStore from 'src/stores/alt/stores/UserStore';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

import AdvancedSearchForm from './forms/AdvancedSearchForm';
import KetcherRailsForm from './forms/KetcherRailsForm';
//import GenericSearchForm from './forms/GenericSearchForm';
import NoFormSelected from './forms/NoFormSelected';

const Components = {
  advanced: AdvancedSearchForm,
  ketcher: KetcherRailsForm,
  //generic: GenericSearchForm,
  empty: NoFormSelected
}

const SearchModal = () => {
  const searchStore = useContext(StoreContext).search;
  const genericElements = UserStore.getState().genericEls || [];
  const profile = UserStore.getState().profile || {};

  let FormData = [
    {
      value: 'advanced',
      label: 'Text search',
      id: 0,
    },
    {
      value: 'ketcher',
      label: 'Structure search',
      id: 1,
    }
  ]

  // genericElements.map((element) => {
  //   const idx = profile.data && profile.data.layout && profile.data.layout[element.name];
  //   if (idx >= 0) {
  //     FormData.push({ value: `${element.id}-generic`, label: element.label, id: element.id })
  //   }
  // });

  const FormComponent = (block) => {
    let value = block.value.includes('generic') ? 'generic' : block.value;
    if (typeof Components[value] !== "undefined") {
      return React.createElement(Components[value], {
        key: `${block.id}-${value}`
      });
    }
    return React.createElement(Components['empty'], {
      key: 'empty'
    });
  };

  const SearchPulldown = (props) => {
    const { onChange, selected } = props;
    const formOptions = FormData.map((option) => option);

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

  let minimizedClass = searchStore.searchModalMinimized ? ' minimized' : '';

  return (
    <Draggable handle=".handle">
      <Modal
        show={searchStore.searchModalVisible}
        onHide={() => searchStore.handleCancel()}
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
              onChange={(e) => searchStore.changeSearchModalSelectedForm(e)}
              selected={searchStore.searchModalSelectedForm}
            />
          </div>
          <div className="col-md-1 col-sm-1">
            <i
              className="fa fa-window-minimize window-minimize"
              onClick={() => searchStore.toggleSearchModalMinimized()} />
          </div>
        </Modal.Header>
        <Modal.Body>
          <React.Suspense fallback={<Spinner />}>
            <div className={`form-container${minimizedClass}`}>
              {FormComponent(searchStore.searchModalSelectedForm)}
            </div>
          </React.Suspense>
        </Modal.Body>
      </Modal>
    </Draggable>
  );
}

export default observer(SearchModal);
