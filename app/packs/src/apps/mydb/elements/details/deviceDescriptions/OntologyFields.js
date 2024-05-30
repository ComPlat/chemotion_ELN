import React from 'react';
import { FormGroup, Modal, Button, ListGroup, ListGroupItem, Panel, ButtonToolbar } from 'react-bootstrap';
import OntologySelect from './OntologySelect';
import { cloneDeep } from 'lodash';
import { GenInterface, GenButtonReload } from 'chem-generic-ui';
import { FlowViewerBtn } from 'src/apps/generic/Utils';
import RevisionViewerBtn from 'src/components/generic/RevisionViewerBtn';
import OntologySortableList from './OntologySortableList';

import UserStore from 'src/stores/alt/stores/UserStore';
import DeviceDescriptionFetcher from 'src/fetchers/DeviceDescriptionFetcher';
import Segment from 'src/models/Segment';

const onNaviClick = (type, id) => {
  console.log('navi', type, id);
  //const { currentCollection, isSync } = UIStore.getState();
  //const collectionUrl = !isNaN(id)
  //  ? `${currentCollection.id}/${type}/${id}`
  //  : `${currentCollection.id}/${type}`;
  //Aviator.navigate(
  //  isSync ? `/scollection/${collectionUrl}` : `/collection/${collectionUrl}`
  //);
};

const addOntology = (selectedData, paths, store, element) => {
  let newOntology = { data: selectedData, paths: paths };
  const ontologies = element['ontologies'] || [];
  let params = {
    id: element['id'],
    ontology: newOntology,
  }
  const oid = ontologies.findIndex((o) => o.data.short_form === newOntology.data.short_form);
  if (oid >= 0) {
    store.toggleOntologyModal();
    return;
  }

  DeviceDescriptionFetcher.fetchSegmentKlassIdsByNewOntology(element['id'], params)
    .then((result) => {
      if (result.length >= 1) {
        newOntology.segments = result;
      }
      const value = ontologies.concat(newOntology);
      store.changeDeviceDescription('ontologies', value);
      store.toggleOntologyModal();
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
}

const deleteOntology = (store, element, index) => {
  if (!element['ontologies']) { return }

  let ontologies = [];
  let segmentKlassIds = [];

  // delete directly
  // element['ontologies'].splice(index, (index >= 0 ? 1 : 0));

  element['ontologies'].map((currentOntology) => {
    if (currentOntology.data.short_form === element['ontologies'][index].data.short_form) {
      const deletedOntology = { ...currentOntology };
      deletedOntology.data.is_deleted = true;
      ontologies.push(deletedOntology);
      segmentKlassIds = currentOntology.segments ? currentOntology.segments : [];
    } else {
      ontologies.push(currentOntology);
    }
  });

  deleteOrUndoDeleteSegments(store, element, segmentKlassIds, true);
  store.changeDeviceDescription('ontologies', ontologies);
}

const undoDelete = (store, element, index) => {
  let ontologies = [];
  let segmentKlassIds = [];
  element['ontologies'].map((currentOntology) => {
    if (currentOntology.data.short_form === element['ontologies'][index].data.short_form) {
      const deletedOntology = { ...currentOntology };
      deletedOntology.data.is_deleted = false;
      ontologies.push(deletedOntology);
      segmentKlassIds = currentOntology.segments ? currentOntology.segments : [];
    } else {
      ontologies.push(currentOntology);
    }
  });

  deleteOrUndoDeleteSegments(store, element, segmentKlassIds, false);
  store.changeDeviceDescription('ontologies', ontologies);
}

const deleteOrUndoDeleteSegments = (store, element, segmentKlassIds, isDeleted) => {
  if (segmentKlassIds.length === 0) { return }

  let segments = [...element['segments']];

  segmentKlassIds.map((segment) => {
    const sid = segments.findIndex((s) => s.segment_klass_id === segment.segment_klass_id);
    if (sid >= 0) {
      segments[sid].is_deleted = isDeleted;
    }
  });
  store.changeDeviceDescription('segments', segments);
}

const changeOntologyMode = (store) => {
  const newMode = store.ontology_mode == 'edit' ? 'order' : 'edit';
  store.changeOntologyMode(newMode);
}

const ontologyModal = (store, element) => {
  return (
    <Modal backdrop="static" show={store.show_ontology_modal} onHide={() => store.toggleOntologyModal()}>
      <Modal.Header closeButton>
        <Modal.Title>Select Ontology</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <OntologySelect fnSelected={addOntology} store={store} element={element} />
      </Modal.Body>
    </Modal>
  );
}

const addOntologyButton = (store, element) => {
  return (
    <>
      <Button
        bsStyle="success"
        bsSize="xsmall"
        className="add-row"
        onClick={() => store.toggleOntologyModal()}
      >
        <i className="fa fa-plus icon-margin-right" />
        Add ontology
      </Button>
      {ontologyModal(store, element)}
    </>
  );
}

const ontologyModeButton = (store, element) => {
  const buttonText = store.ontology_mode === 'order' ? 'Order mode' : 'Edit mode';
  const buttonIcon = store.ontology_mode === 'order' ? 'fa fa-reorder' : 'fa fa-edit';
  const styleClass = store.ontology_mode === 'order' ? 'success' : 'primary';
  const readonly = !element['ontologies'] ? true : false;
  return (
    <Button
      disabled={readonly}
      bsSize="xsmall"
      bsStyle={styleClass}
      className="add-row"
      onClick={() => changeOntologyMode(store)}
    >
      <i className={`${buttonIcon} icon-margin-right`} aria-hidden="true" />
      {buttonText}
    </Button>
  );
}

const deleteOntologyButton = (store, element, index) => {
  if (element['ontologies'][index].data.is_deleted) { return null; }

  return (
    <Button
      bsSize="xsmall"
      bsStyle="danger"
      onClick={() => deleteOntology(store, element, index)}
      className="delete-in-list"
    >
      <i className="fa fa-trash-o" />
    </Button>
  );
}

const undoDeleteButton = (store, element, index) => {
  const isDeleted = element['ontologies'][index].data.is_deleted;
  if (isDeleted === undefined || !isDeleted) { return null; }

  return (
    <Button
      bsSize="xsmall"
      bsStyle="danger"
      className="delete-in-list"
      onClick={() => undoDelete(store, element, index)}
    >
      <i className="fa fa-undo" aria-hidden="true" />
    </Button>
  );
}

const setSelectedSegmentId = (segment, store) => {
  store.setSelectedSegmentId(segment.id);
}

const segmentVersionToolbar = (store, segment, segmentKlass, handleSegmentsChange, handleRetrieveRevision, i, j) => {
  return (
    <ButtonToolbar style={{ margin: '5px 0px' }} key={`revisions-buttons-${i}-${j}`}>
      <FlowViewerBtn generic={segment} />
      <div onClick={() => setSelectedSegmentId(segment, store)}>
        <RevisionViewerBtn
          fnRetrieve={handleRetrieveRevision}
          generic={segment}
          key={`revision-viewer-button-${i}-${j}`}
        />
      </div>
      <GenButtonReload
        klass={segmentKlass}
        generic={segment}
        fnReload={handleSegmentsChange}
        key={`revision-reload-button-${i}-${j}`}
      />
    </ButtonToolbar>
  );
}

const ontologySegmentList = (store, element, handleSegmentsChange, handleRetrieveRevision) => {
  let list = [];
  const segmentKlasses = (UserStore.getState() && UserStore.getState().segmentKlasses) || [];
  let existingSegment = {}

  if (element['ontologies']) {
    element['ontologies']
      .sort((a, b) => a.index - b.index)
      .forEach((ontology, i) => {
        if (!ontology['segments']) { return }

        let rows = [];
        const className = i == 0 ? 'first' : '';
        let deletedClass = '';
        let collapsedClass = '';

        ontology['segments'].forEach((segment, j) => {
          const segmentKlass = segmentKlasses.find(
            (s) => s.element_klass && s.element_klass.name === element.type && segment['segment_klass_id'] == s.id
          );
          existingSegment = element['segments'].find((s) => {
            return segment['segment_klass_id'] === s.segment_klass_id;
          });

          let segmentElement = {};
          if (existingSegment) {
            segmentElement = existingSegment;
          } else {
            segmentElement = Segment.buildEmpty(cloneDeep(segmentKlass));
          }
          if (segmentElement.is_deleted) {
            deletedClass = 'deleted';
            collapsedClass = 'collapse-deleted';
          }

          rows.push(
            segmentVersionToolbar(store, segmentElement, segmentKlass, handleSegmentsChange, handleRetrieveRevision, i, j)
          );
          rows.push(
            <GenInterface
              generic={segmentElement}
              fnChange={handleSegmentsChange}
              extLayers={[]}
              genId={0}
              isPreview={false}
              isSearch={false}
              isActiveWF={false}
              fnNavi={onNaviClick}
              key={`ontology-${i}-${j}`}
            />
          );
        });
        list.push(
          <Panel
            className={`ontology-segments ${className} ${deletedClass}`}
            key={`ontology-segments-list-${i}`}
            defaultExpanded
          >
            <Panel.Heading>
              <Panel.Title toggle>{`${ontology['data']['label']}`}</Panel.Title>
            </Panel.Heading>
            <Panel.Collapse className={collapsedClass}>
              <Panel.Body>{rows}</Panel.Body>
            </Panel.Collapse>
          </Panel>
        );
      });
  }

  return list;
}

const ontologySortableListItem = (store, element) => {
  return (
    <OntologySortableList
      key={`${store.key_prefix}-ontologies-row`}
      store={store}
      element={element}
    />
  );
};

const ontologyListItem = (store, element) => {
  let rows = [];
  element['ontologies']
    .sort((a, b) => a.index - b.index)
    .map((ontology, i) => {
      const deletedClass = ontology.data.is_deleted ? 'deleted-ontology' : '';
      const hasNoSegmentsClass = !ontology.segments ? 'without-segments' : '';
      let paths = [];
      ontology.paths.map((p) => paths.push(p.label));

      rows.push(
        <ListGroupItem
          header={ontology.data.label}
          key={`${store.key_prefix}-${ontology.data.label}-${i}`}
          className={`list-group-with-button ${deletedClass} ${hasNoSegmentsClass}`}
        >
          {paths.join(' / ')}
          {undoDeleteButton(store, element, i)}
          {deleteOntologyButton(store, element, i)}
        </ListGroupItem>
      );
    });
  return rows;
}

const ontologiesList = (store, element) => {
  let list = [];

  if (element['ontologies']) {
    if (store.ontology_mode == 'edit') {
      list.push(
        <ListGroup className="ontology-list" key="ontology_list">
          {ontologyListItem(store, element)}
        </ListGroup>
      );
    } else {
      list = ontologySortableListItem(store, element);
    }
  }

  return (
    <FormGroup key={`${store.key_prefix}- ${element['name']}`}>
      <div className="grouped-fields-row">
        {ontologyModeButton(store, element)}
        {addOntologyButton(store, element)}
      </div>
      {list}
    </FormGroup>
  );
}

export { ontologiesList, ontologySegmentList };

