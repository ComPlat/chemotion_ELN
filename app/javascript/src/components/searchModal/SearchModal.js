/* eslint-disable react/function-component-definition, react/no-unstable-nested-components */
import React, { useContext, useState } from 'react';
import {
  Button, ButtonGroup, Modal, Stack
} from 'react-bootstrap';
import Draggable from 'react-draggable';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

import TextSearch from 'src/components/searchModal/forms/TextSearch';
import KetcherRailsForm from 'src/components/searchModal/forms/KetcherRailsForm';
import PublicationSearch from 'src/components/searchModal/forms/PublicationSearch';
import NoFormSelected from 'src/components/searchModal/forms/NoFormSelected';

const Components = {
  advanced: TextSearch,
  ketcher: KetcherRailsForm,
  publication: PublicationSearch,
  empty: NoFormSelected
};

const SearchModal = () => {
  const searchStore = useContext(StoreContext).search;
  const [deltaPosition, setDeltaPosition] = useState({ x: 0, y: 0 });

  if (!searchStore.searchModalVisible) return null;

  const FormData = [
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
    const value = block.value.includes('generic') ? 'generic' : block.value;
    if (typeof Components[value] !== 'undefined') {
      return React.createElement(Components[value], {
        key: `${block.id}-${value}`
      });
    }
    return React.createElement(Components.empty, {
      key: 'empty'
    });
  };

  const Spinner = () => (
    <i className="fa fa-spinner fa-pulse fa-3x fa-fw" />
  );

  const handleDrag = (e, ui) => {
    const { x, y } = deltaPosition;
    setDeltaPosition({
      x: x + ui.deltaX,
      y: y + ui.deltaY,
    });
  };

  const minimizedClass = searchStore.searchModalMinimized ? ' minimized' : '';
  const modalClass = minimizedClass ? `draggable-modal-dialog-xxxl${minimizedClass}` : 'modal-dialog-fullscreen';
  const modalStyle = minimizedClass ? { transform: `translate(${deltaPosition.x}px, ${deltaPosition.y}px)` } : '';
  const searchTypeTextClass = searchStore.searchModalSelectedForm.value === 'advanced' ? 'active' : '';
  const searchTypePublicationClass = searchStore.searchModalSelectedForm.value === 'publication' ? 'active' : '';
  const searchTypeStructureClass = searchStore.searchModalSelectedForm.value === 'ketcher' ? 'active' : '';

  return (
    <Draggable handle=".modal-header" onDrag={handleDrag}>
      <div>
        <Modal
          show
          onHide={() => searchStore.handleCancel()}
          backdrop={false}
          keyboard={false}
          className={modalClass}
          size="xxxl"
          dialogClassName="draggable-modal"
          contentClassName={`draggable-modal-content${minimizedClass}`}
          style={modalStyle}
        >

          <Modal.Header className="ps-0 border-bottom border-gray-600 bg-gray-300" id="search-modal-header" closeButton>
            <Stack direction="horizontal" className="draggable-modal-stack" gap={3}>
              <Modal.Title className="draggable-modal-stack-title">
                <i className="fa fa-arrows move" />
                Please select your search criteria
              </Modal.Title>
              <ButtonGroup className="ms-5 ms-lg-auto me-lg-5 gap-2 order-2 order-lg-1">
                <Button
                  onClick={(e) => searchStore.changeSearchModalSelectedForm(FormData[0])}
                  className={searchTypeTextClass}
                  variant="ghost"
                >
                  <i className="fa fa-align-justify button-icon" />
                  Text search
                </Button>
                <Button
                  onClick={(e) => searchStore.changeSearchModalSelectedForm(FormData[2])}
                  className={searchTypePublicationClass}
                  variant="ghost"
                >
                  <i className="fa fa-newspaper-o button-icon" />
                  Publication search
                </Button>
                <Button
                  onClick={(e) => searchStore.changeSearchModalSelectedForm(FormData[1])}
                  className={searchTypeStructureClass}
                  variant="ghost"
                >
                  <i className="icon-pubchem me-1" />
                  Structure search
                </Button>
              </ButtonGroup>
              <Button className="order-1 order-lg-2 ms-auto ms-lg-5 pt-2 align-self-start bg-transparent border-0">
                <i
                  className="fa fa-window-minimize window-minimize"
                  onClick={() => searchStore.toggleSearchModalMinimized()}
                />
              </Button>
            </Stack>
          </Modal.Header>

          <Modal.Body className="p-0 d-flex flex-column overflow-hidden vh-100">
            <React.Suspense fallback={<Spinner />}>
              <div className={`draggable-modal-form-container${minimizedClass}`}>
                {FormComponent(searchStore.searchModalSelectedForm)}
              </div>
            </React.Suspense>
          </Modal.Body>
        </Modal>
      </div>
    </Draggable>
  );
};

export default observer(SearchModal);
