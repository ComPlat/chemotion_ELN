import { List } from 'immutable';

const parseLayout = (layout) => {
  if (typeof layout !== 'string') return layout || {};
  try {
    return JSON.parse(layout) || {};
  } catch (e) {
    return {};
  }
};

const listLayoutFor = (collection, profileLayout = {}) => {
  const own = parseLayout(collection?.list_layout);
  const layout = {};
  Object.keys(profileLayout).forEach((name) => {
    const order = Number(own[name]);
    layout[name] = Number.isFinite(order) && order !== 0 ? order : -1000;
  });
  return Object.values(layout).some((order) => order > 0) ? layout : profileLayout;
};

function getVisibleAndHiddenFromLayout(layout) {
  const visible = [];
  const hidden = [];
  Object.keys(layout).forEach((key) => {
    if (layout[key] < 0) {
      hidden.push(key);
    } else {
      visible.push(key);
    }
  });

  return {
    visible: List(visible).sortBy((t) => layout[t]),
    hidden: List(hidden).sortBy((t) => -1 * layout[t]),
  };
}

export { parseLayout, listLayoutFor, getVisibleAndHiddenFromLayout };
