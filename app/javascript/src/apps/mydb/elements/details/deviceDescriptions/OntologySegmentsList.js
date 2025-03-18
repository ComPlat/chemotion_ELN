import React from 'react';
import { Accordion, Form } from 'react-bootstrap';
import { cloneDeep } from 'lodash';
import { Constants, GenInterface, GenToolbar } from 'chem-generic-ui';

import UserStore from 'src/stores/alt/stores/UserStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import Segment from 'src/models/Segment';
import { observer } from 'mobx-react';

const OntologySegmentsList = ({ store, element, isSelection }) => {
  const ontologies = element['ontologies'] || [];
  if (ontologies.length < 1) { return null; }

  let list = [];
  const segmentKlasses = (UserStore.getState() && UserStore.getState().segmentKlasses) || [];
  let existingSegment = {}

  const toggleSegment = (segment) => {
    store.toggleSegment(segment);
  }

  const handleSegmentsChange = (segment) => {
    let segments = [...element.segments];
    const sid = segments.findIndex((s) => s.segment_klass_id === segment.segment_klass_id);
    if (sid >= 0) { segments.splice(sid, 1, segment); } else { segments.push(segment); }

    store.changeDeviceDescription('segments', segments);
  }

  const handleRetrieveRevision = (revision, cb) => {
    let segments = [...element.segments];
    const selectedSegmentId = store.selected_segment_id;
    const sid = segments.findIndex((s) => s.id === selectedSegmentId);

    if (sid !== -1) {
      segments[sid].properties = revision;
      cb();
      store.changeDeviceDescription('segments', segments);
      store.setSelectedSegmentId(0);
    } 
  }

  const handleExport = (segment) => {
    ElementActions.exportElement(segment, 'Segment', 'docx');
  }

  const handleExpandAll = (expanded) => {
    store.changeSegmentExpandAll(expanded)
  }

  const changeFormSelection = (index_ontology, index_segment, event) => {
    event.stopPropagation();
    let ontologies = [...element.ontologies];
    ontologies[index_ontology].segments[index_segment].show = event.target.checked;
    store.changeDeviceDescription('ontologies', ontologies);
  }

  const segmentVersionToolbar = (segment, segmentKlass, index, j) => {
    return (
      <GenToolbar
        generic={segment}
        genericType={Constants.GENERIC_TYPES.SEGMENT}
        klass={segmentKlass}
        fnExport={handleExport}
        fnReload={handleSegmentsChange}
        fnRetrieve={handleRetrieveRevision}
        onExpandAll={handleExpandAll}
        key={`revisions-buttons-${index}-${j}`}
      />
    );
  }

  const genericFormFields = (rows, ontology, index) => {
    ontology['segments'].forEach((segment, j) => {
      const segmentKlass = segmentKlasses.find(
        (s) => s.element_klass && s.element_klass.name === element.type && segment['segment_klass_id'] == s.id
      );
      existingSegment = element['segments'].find((s) => {
        return segment['segment_klass_id'] === s.segment_klass_id;
      });

      const segmentElement = existingSegment ? existingSegment : Segment.buildEmpty(cloneDeep(segmentKlass));

      if (isSelection) {
        const accordionRowIdent = `segment-row-${j}`;
        const showValue = segment['show'] === undefined ? true : segment['show'];
        rows.push(
          <Accordion
            className="mb-4"
            key={`ontology-row-segments-list-${j}`}
          >
            <Accordion.Item eventKey={accordionRowIdent}>
              <Accordion.Header>
                <div className="d-flex gap-2">
                  <div onClick={(event) => event.stopPropagation()}>
                    <Form.Check
                      type="checkbox"
                      label="Use this form for"
                      checked={showValue}
                      onChange={(event) => changeFormSelection(index, j, event)}
                    />
                  </div>
                  <b>{segmentKlass.label}</b>
                </div>
              </Accordion.Header>
              <Accordion.Body>
                <div className="mb-3">
                  <GenInterface
                    generic={segmentElement}
                    fnChange={handleSegmentsChange}
                    extLayers={[]}
                    genId={0}
                    isPreview={false}
                    isSearch={false}
                    isActiveWF={false}
                    fnNavi={() => {}}
                    expandAll={store.segment_expand_all}
                    key={`ontology-${index}-${j}`}
                  />
                </div>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        );
      } else {
        if (segment['show']) {
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
              expandAll={store.segment_expand_all}
              key={`ontology-${index}-${j}`}
            />
          );
        }
      }
    });
    return rows;
  }

  const segmentsOfOntologies = () => {
    list = [];

    ontologies
      .sort((a, b) => a.index - b.index)
      .forEach((ontology, index) => {
        let rows = [];
        if (!ontology['segments']) { return null; }
        if (store.ontology_index_for_edit !== index && store.ontology_index_for_edit !== -1) { return null; }

        const showSegment = ontology['segments'].filter((s) => s['show'] !== false);
        if (showSegment.length < 1 && !isSelection) { return null; }

        let deletedClass = '';
        const accordionIdent = isSelection ? `segment-selection-${index}` : `segment-${index}`;
        let isActive = store.toggable_segments.findIndex(i => i === accordionIdent) === -1;

        if (ontology.data.is_deleted) {
          deletedClass = ' text-decoration-line-through';
          isActive = false;
        }

        rows = genericFormFields(rows, ontology, index);

        if (isSelection) {
          list.push(<h3 className="mb-4">{ontology.data.label}</h3>);
          list.push(rows);
        } else {
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
        }
      });
    return list;
  }

  return segmentsOfOntologies();
}

export default observer(OntologySegmentsList);
