import React from 'react';
import { Accordion, ButtonToolbar } from 'react-bootstrap';
import { cloneDeep } from 'lodash';
import { GenInterface, GenButtonReload } from 'chem-generic-ui';
import { GenFlowViewerBtn } from 'chem-generic-ui';
import { renderFlowModal } from 'src/apps/generic/Utils';
import RevisionViewerBtn from 'src/components/generic/RevisionViewerBtn';

import UserStore from 'src/stores/alt/stores/UserStore';
import Segment from 'src/models/Segment';
import { observer } from 'mobx-react';

const OntologySegmentsList = ({ store, element, handleSegmentsChange, handleRetrieveRevision }) => {
  const ontologies = element['ontologies'] || [];
  if (ontologies.length < 1) { return null; }

  let list = [];
  const segmentKlasses = (UserStore.getState() && UserStore.getState().segmentKlasses) || [];
  let existingSegment = {}

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

  const setSelectedSegmentId = (segment) => {
    store.setSelectedSegmentId(segment.id);
  }

  const toggleSegment = (segment) => {
    store.toggleSegment(segment);
  }

  // <GenFlowViewerBtn generic={segment} fnClick={renderFlowModal} />
  // <RevisionViewerBtn
  //   fnRetrieve={handleRetrieveRevision}
  //   generic={segment}
  //   key={`revision-viewer-button-${index}-${j}`}
  // />

  // <GenButtonReload
  //   klass={segmentKlass}
  //   generic={segment}
  //   fnReload={handleSegmentsChange}
  //   key={`revision-reload-button-${index}-${j}`}
  // />

  const segmentVersionToolbar = (segment, segmentKlass, index, j) => {
    return (
      <ButtonToolbar className="my-2" key={`revisions-buttons-${index}-${j}`}>
        <div onClick={() => setSelectedSegmentId(segment)}>
          GenFlowViewerBtn
          <br />
          RevisionViewerBtn
        </div>
        GenButtonReload
      </ButtonToolbar>
    );
  }

  const segmentsOfOntologies = () => {
    list = [];

    ontologies
      .sort((a, b) => a.index - b.index)
      .forEach((ontology, index) => {
        let rows = [];
        if (!ontology['segments']) { return null; }

        ontology['segments'].forEach((segment, j) => {
          const segmentKlass = segmentKlasses.find(
            (s) => s.element_klass && s.element_klass.name === element.type && segment['segment_klass_id'] == s.id
          );
          existingSegment = element['segments'].find((s) => {
            return segment['segment_klass_id'] === s.segment_klass_id;
          });

          const segmentElement = existingSegment ? existingSegment : Segment.buildEmpty(cloneDeep(segmentKlass));

          rows.push(segmentVersionToolbar(segmentElement, segmentKlass, index, j));
          rows.push(<div key={`interface-${index}-${j}`}>GenInterface</div>);
          // rows.push(
          //   <GenInterface
          //     generic={segmentElement}
          //     fnChange={handleSegmentsChange}
          //     extLayers={[]}
          //     genId={0}
          //     isPreview={false}
          //     isSearch={false}
          //     isActiveWF={false}
          //     fnNavi={onNaviClick}
          //     key={`ontology-${i}-${j}`}
          //   />
          // );
        });

        let deletedClass = '';
        const accordionIdent = `segment-${index}`;
        let isActive = store.toggable_segments.findIndex(i => i === accordionIdent) === -1;

        if (ontology.data.is_deleted) {
          deletedClass = ' text-decoration-line-through';
          isActive = false;
        }

        list.push(
          <Accordion
            className={`mb-4${deletedClass}`}
            activeKey={isActive && accordionIdent}
            onSelect={() => toggleSegment(accordionIdent)}
            key={`ontology-segments-list-${index}`}
          >
            <Accordion.Item eventKey={accordionIdent}>
              <Accordion.Header>
                {`${ontology.data.label}`}
              </Accordion.Header>
              <Accordion.Body>
                <div className="mb-3">
                  {rows}
                </div>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        ); 
      });
    return list;
  }

  return segmentsOfOntologies();
}

export default observer(OntologySegmentsList);
