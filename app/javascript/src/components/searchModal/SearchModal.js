import React, { useContext, useState } from 'react';
import { Button, ButtonGroup, Modal, Stack } from 'react-bootstrap';
import Draggable from "react-draggable";
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

import TextSearch from './forms/TextSearch';
import KetcherRailsForm from './forms/KetcherRailsForm';
import PublicationSearch from './forms/PublicationSearch';
import OpenSearchAnalysis from './forms/OpenSearchAnalysis';
import NoFormSelected from './forms/NoFormSelected';

const Components = {
  advanced: TextSearch,
  ketcher: KetcherRailsForm,
  publication: PublicationSearch,
  opensearch: OpenSearchAnalysis,
  empty: NoFormSelected
}

const SearchModal = () => {
  const searchStore = useContext(StoreContext).search;
  const [deltaPosition, setDeltaPosition] = useState({ x: 0, y: 0 });

  if (!searchStore.searchModalVisible) return null;

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
    {
      value: 'opensearch',
      label: 'Analysis Explorer',
      id: 3,
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

  const handleDrag = (e, ui) => {
    const { x, y } = deltaPosition;
    setDeltaPosition({
      x: x + ui.deltaX,
      y: y + ui.deltaY,
    });
  }

  let minimizedClass = searchStore.searchModalMinimized ? ' minimized' : '';
  let searchTypeTextClass = searchStore.searchModalSelectedForm.value === 'advanced' ? 'active' : 'text-bg-paper';
  let searchTypePublicationClass = searchStore.searchModalSelectedForm.value === 'publication' ? 'active' : 'text-bg-paper';
  let searchTypeStructureClass = searchStore.searchModalSelectedForm.value === 'ketcher' ? 'active' : 'text-bg-paper';
  let searchTypeOpenSearchClass = searchStore.searchModalSelectedForm.value === 'opensearch' ? 'active' : 'text-bg-paper';

  return (
    <Draggable handle=".modal-header" onDrag={handleDrag}>
      <div>
        <Modal
          show={true}
          onHide={() => searchStore.handleCancel()}
          backdrop={false}
          keyboard={false}
          className={`draggable-modal-dialog-xxxl${minimizedClass}`}
          size="xxxl"
          dialogClassName="draggable-modal"
          contentClassName={`draggable-modal-content${minimizedClass}`}
          style={{
            transform: `translate(${deltaPosition.x}px, ${deltaPosition.y}px)`,
          }}
        >

          <Modal.Header className="ps-0 border-bottom border-gray-600 bg-gray-300" closeButton>
            <Stack direction="horizontal" className="draggable-modal-stack" gap={3}>
              <Modal.Title className="draggable-modal-stack-title">
                <i className="fa fa-arrows move" />
                Please select your search criteria
              </Modal.Title>
              <ButtonGroup className="ms-5 ms-lg-auto me-lg-5 gap-2 order-2 order-lg-1">
                <Button
                  onClick={(e) => searchStore.changeSearchModalSelectedForm(FormData[0])}
                  className={searchTypeTextClass}
                  variant="outline-dark"
                >
                  <i className="fa fa-align-justify button-icon" />
                  Text search
                </Button>
                <Button
                  onClick={(e) => searchStore.changeSearchModalSelectedForm(FormData[2])}
                  className={searchTypePublicationClass}
                  variant="outline-dark"
                >
                  <i className="fa fa-newspaper-o button-icon" />
                  Publication search
                </Button>
                <Button
                  onClick={(e) => searchStore.changeSearchModalSelectedForm(FormData[1])}
                  className={searchTypeStructureClass}
                  variant="outline-dark"
                >
                  <i className="icon-pubchem me-1" />
                  Structure search
                </Button>
                <Button
                  onClick={(e) => searchStore.changeSearchModalSelectedForm(FormData[3])}
                  className={searchTypeOpenSearchClass}
                  variant="outline-dark"
                >
                  <i className="fa fa-flask me-1" />
                  Analysis Explorer
                </Button>
              </ButtonGroup>
              <Button className="order-1 order-lg-2 ms-auto ms-lg-5 pt-2 align-self-start bg-transparent border-0">
                <i
                  className="fa fa-window-minimize window-minimize"
                  onClick={() => searchStore.toggleSearchModalMinimized()} />
              </Button>
            </Stack>
          </Modal.Header>

          <Modal.Body className="p-0">
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
}

export default observer(SearchModal);
