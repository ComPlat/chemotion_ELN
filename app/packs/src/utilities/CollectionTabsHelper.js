import { getElementSegments } from './ElementUtils';
import Immutable from 'immutable';

const getVisibilityList = (layout, availableTabs, addInventoryTab) => {
  const layoutKeys = Object.keys(layout);

  if (addInventoryTab) {
    layout.inventory = layoutKeys.length + 1;
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
  if (hidden.length === 0) {
    hidden.push('hidden');
  }
  return {
    visible: Immutable.List(visible.filter(n => n !== undefined)),
    hidden: Immutable.List(hidden.filter(n => (n !== undefined && n !== first)))
  };
};

const getArrayFromLayout = (layout, element, addInventoryTab, availableTabs = null ) => {
  let layoutKeys = Object.keys(layout);
  let segmentAvailableTabs = getElementSegments(element, layoutKeys);
  availableTabs = [...availableTabs, ...segmentAvailableTabs];
  return getVisibilityList(layout, availableTabs, addInventoryTab);
};

const filterTabLayout = (layoutState) => {
  const { visible, hidden } = layoutState;
  const layout = {};

  visible.forEach((value, index) => {
    layout[value] = (index + 1);
  });
  hidden.filter(val => val !== 'hidden').forEach((value, index) => {
    layout[value] = (-index - 1);
  });
  return layout;
};

export { getArrayFromLayout, filterTabLayout };
