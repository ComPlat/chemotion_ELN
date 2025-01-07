import React from 'react';
import { Accordion } from 'react-bootstrap';
import { cloneDeep } from 'lodash';
import { Constants, GenInterface, GenToolbar } from 'chem-generic-ui';

import UserStore from 'src/stores/alt/stores/UserStore';
import Segment from 'src/models/Segment';
import { observer } from 'mobx-react';

const OntologySegmentsList = ({ store, element, handleSegmentsChange, handleRetrieveRevision }) => {
  const ontologies = element['ontologies'] || [];
  if (ontologies.length < 1) { return null; }

  let list = [];
  const segmentKlasses = (UserStore.getState() && UserStore.getState().segmentKlasses) || [];
  let existingSegment = {}

  const toggleSegment = (segment) => {
    store.toggleSegment(segment);
  }

  const segmentVersionToolbar = (segment, segmentKlass, index, j) => {
    return (
      <GenToolbar
        generic={segment}
        genericType={Constants.GENERIC_TYPES.SEGMENT}
        klass={segmentKlass}
        fnReload={handleSegmentsChange}
        fnRetrieve={handleRetrieveRevision}
        key={`revisions-buttons-${index}-${j}`}
      />
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
          rows.push(
            <GenInterface
              generic={segmentElement}
              fnChange={handleSegmentsChange}
              extLayers={[]}
              genId={0}
              isPreview={false}
              isSearch={false}
              isActiveWF={false}
              fnNavi={() => {}}
              key={`ontology-${index}-${j}`}
            />
          );
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
