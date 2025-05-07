import { getElementSegments } from './ElementUtils';
import Immutable from 'immutable';

const getVisibilityList = (layout, availableTabs, addInventoryTab) => {
  if (typeof layout === 'undefined') {
    // eslint-disable-next-line no-param-reassign
    layout = { properties: 1, analyses: 2, attachments: 3 };
  }
  const layoutKeys = Object.keys(layout);

  if (addInventoryTab && layout) {
    // eslint-disable-next-line no-param-reassign
    layout.inventory = layout.inventory || layoutKeys.length + 1;
  }
  const enabled = availableTabs.filter(val => layoutKeys.includes(val));
  const leftover = availableTabs.filter(val => !layoutKeys.includes(val));
  const visible = [];
  let hidden = [];

  enabled.forEach((key) => {
    const order = layout[key];
    if (order < 0) { hidden[Math.abs(order)] = key; }
    if (order > 0) { visible[order] = key; }
  });

  leftover.forEach(key => hidden.push(key));

  let first = null;
  if (visible.length === 0) {
    first = hidden.filter(n => n !== undefined)[0];
    if (first) {
      visible.push(first);
    }
  }
  hidden = hidden.filter(n => n);
  return {
    visible: Immutable.List(visible.filter(n => n !== undefined)),
    hidden: Immutable.List(hidden.filter(n => (n !== undefined && n !== first)))
  };
};

const getArrayFromLayout = (layout, element, addInventoryTab, availableTabs = null) => {
  if (typeof layout === 'undefined') {
    // eslint-disable-next-line no-param-reassign
    layout = { properties: 1, analyses: 2, attachments: 3 };
  }
  const layoutKeys = Object.keys(layout);
  const segmentAvailableTabs = availableTabs || getElementSegments(element, layoutKeys);
  return getVisibilityList(layout, segmentAvailableTabs, addInventoryTab);
};

const filterTabLayout = (layoutState) => {
  const { visible, hidden } = layoutState;
  const layout = {};

  visible.forEach((value, index) => {
    layout[value] = (index + 1);
  });
  hidden.forEach((value, index) => {
    layout[value] = (-index - 1);
  });
  return layout;
};

export { getArrayFromLayout, filterTabLayout };
