/* eslint-disable no-restricted-globals */
import React from 'react';
import { findIndex, cloneDeep } from 'lodash';
import Aviator from 'aviator';
import { OverlayTrigger, Tooltip, Tab } from 'react-bootstrap';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import GenericSGDetails from 'src/components/generic/GenericSGDetails';
import Segment from 'src/models/Segment';
import MatrixCheck from 'src/components/common/MatrixCheck';
import ElementActions from 'src/stores/alt/actions/ElementActions';

const onNaviClick = (type, id) => {
  const { currentCollection, isSync } = UIStore.getState();
  const collectionUrl = !isNaN(id)
    ? `${currentCollection.id}/${type}/${id}`
    : `${currentCollection.id}/${type}`;
  Aviator.navigate(
    isSync ? `/scollection/${collectionUrl}` : `/collection/${collectionUrl}`,
    { silent: true },
  );
  if (type === 'reaction') {
    ElementActions.fetchReactionById(id);
  } else if (type === 'sample') {
    ElementActions.fetchSampleById(id);
  } else {
    ElementActions.fetchGenericElById(id);
  }
};

const addSegmentTabs = (element, onChange, contentMap) => {
  const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};
  const uiCtrl = MatrixCheck(currentUser.matrix, 'segment');
  if (!uiCtrl) return;
  let segmentKlasses = (UserStore.getState() && UserStore.getState().segmentKlasses) || [];
  segmentKlasses = segmentKlasses.filter(
    (s) => s.element_klass && s.element_klass.name === element.type
  );
  segmentKlasses.forEach((klass) => {
    const ttl = <Tooltip id="tooltip">{klass.desc}</Tooltip>;
    const idx = findIndex(
      element.segments,
      (o) => o.segment_klass_id === klass.id
    );
    if (idx < 0 && !klass.is_active) return;
    let segment;
    if (idx > -1) {
      segment = element.segments[idx];
    } else {
      segment = Segment.buildEmpty(cloneDeep(klass));
    }
    const title = (
      <OverlayTrigger placement="bottom" delayShow={1000} overlay={ttl}>
        <div>{klass.label}</div>
      </OverlayTrigger>
    );
    contentMap[klass.label] = (
      <Tab
        eventKey={klass.label}
        key={`${element.type}_${element.id}_${klass.id}`}
        title={title}
      >
        <GenericSGDetails
          uiCtrl
          segment={segment}
          klass={klass}
          onChange={onChange}
          fnNavi={onNaviClick}
        />
      </Tab>
    );
  });
};

const SegmentTabs = (element, onChange) => {
  const result = {};
  const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};
  const uiCtrl = MatrixCheck(currentUser.matrix, 'segment');
  if (!uiCtrl) return {};
  let segmentKlasses = (UserStore.getState() && UserStore.getState().segmentKlasses) || [];
  segmentKlasses = segmentKlasses.filter(
    (s) => s.element_klass && s.element_klass.name === element.type
  );
  segmentKlasses.forEach((klass) => {
    const ttl = <Tooltip id="tooltip">{klass.desc}</Tooltip>;
    const idx = findIndex(
      element.segments,
      (o) => o.segment_klass_id === klass.id
    );
    let segment = {};
    if (idx > -1) {
      segment = element.segments[idx];
    } else {
      segment = Segment.buildEmpty(cloneDeep(klass));
    }
    const title = (
      <OverlayTrigger placement="bottom" delayShow={1000} overlay={ttl}>
        <div>{klass.label}</div>
      </OverlayTrigger>
    );

    const tabKey = klass.label;
    result[tabKey] = () => (
      <Tab eventKey={tabKey} key={tabKey} title={title}>
        <GenericSGDetails
          uiCtrl={uiCtrl}
          segment={segment}
          klass={klass}
          onChange={onChange}
          fnNavi={onNaviClick}
        />
      </Tab>
    );
  });
  return result;
};

export { SegmentTabs, addSegmentTabs };
