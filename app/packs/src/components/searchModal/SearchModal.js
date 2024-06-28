import React, { useContext } from 'react';
import { Button, ButtonGroup, Modal } from 'react-bootstrap';
import Draggable from "react-draggable";
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

import TextSearch from './forms/TextSearch';
import KetcherRailsForm from './forms/KetcherRailsForm';
import PublicationSearch from './forms/PublicationSearch';
import NoFormSelected from './forms/NoFormSelected';

const Components = {
  advanced: TextSearch,
  ketcher: KetcherRailsForm,
  publication: PublicationSearch,
  empty: NoFormSelected
}

const SearchModal = () => {
  const searchStore = useContext(StoreContext).search;

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
    },
    {
      value: 'publication',
      label: 'PublicationSearch',
      id: 2,
    },
  ];

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

  const Spinner = () => {
    return (
      <i className="fa fa-spinner fa-pulse fa-3x fa-fw" />
    );
  }

  let minimizedClass = searchStore.searchModalMinimized ? ' minimized' : '';
  let searchTypeTextClass = searchStore.searchModalSelectedForm.value === 'advanced' ? 'active' : '';
  let searchTypePublicationClass = searchStore.searchModalSelectedForm.value === 'publication' ? 'active' : '';
  let searchTypeStructureClass = searchStore.searchModalSelectedForm.value === 'ketcher' ? 'active' : '';

  return (
    <Draggable handle=".handle">
      <Modal
        centered
        show={searchStore.searchModalVisible}
        onHide={() => searchStore.handleCancel()}
        backdrop={false}
        dialogas="full-search"
        dialogClassName="searching"
      >
        <Modal.Header className="handle" closeButton>
          <div className="col-md-4 col-sm-11">
            <Modal.Title>
              <i className="fa fa-arrows move" />
              Please select your search criteria
            </Modal.Title>
          </div>
          <div className="col-md-7 col-sm-11">
            <ButtonGroup className="search-selection">
              <Button
                onClick={(e) => searchStore.changeSearchModalSelectedForm(FormData[0])}
                className={searchTypeTextClass}
              >
                <span className="search-icon">
                  <i className="fa fa-align-justify" />
                </span>
                Text search
              </Button>
              <Button
                onClick={(e) => searchStore.changeSearchModalSelectedForm(FormData[2])}
                className={searchTypePublicationClass}
              >
                <span className="search-icon">
                  <i className="fa fa-newspaper-o" />
                </span>
                Publication search
              </Button>
              <Button
                onClick={(e) => searchStore.changeSearchModalSelectedForm(FormData[1])}
                className={searchTypeStructureClass}
              >
                <span className="search-icon">
                  <img src="/images/wild_card/pubchem.svg" className="pubchem-logo" />
                </span>
                Structure search
              </Button>
            </ButtonGroup>
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
