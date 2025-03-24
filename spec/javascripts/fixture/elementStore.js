const emptyElementState = {
  samples: {
    elements: [],
    ids: [],
    totalElements: 0
  },
  reactions: {
    elements: [],
    ids: [],
    totalElements: 0
  },
  wellplates: {
    elements: [],
    ids: [],
    totalElements: 0
  },
  screens: {
    elements: [],
    ids: [],
    totalElements: 0
  },
  devices: {
    devices: [],
    activeAccordionDevice: 0,
    selectedDeviceId: -1
  },
  research_plans: {
    elements: [],
    ids: [],
    totalElements: 0
  },
  cell_lines: {
    elements: [],
    ids: [],
    totalElements: 0
  },
  device_descriptions: {
    elements: [],
    totalElements: 0,
    page: 1,
    pages: 0,
    perPage: 15
  },
  page_size: 15
};
const emptyState = {
  elements: emptyElementState,
  currentElement: null,
  elementWarning: false,
  moleculeSort: false,
  selecteds: [],
  refreshCoefficient: [],
  activeKey: 0,
  deletingElement: null
};

const twoSampleState = {
  ...emptyState,
  elements: {
    ...emptyElementState,
    samples: {
      elements: [
        {
          id: 1,
          name: 'sample1',
          description: 'sample1 description'
        },
        {
          id: 2,
          name: 'sample2',
          description: 'sample2 description'
        }
      ],
      ids: [1, 2],
      totalElements: 2,
      page: 1,
      pages: 1,
      perPage: 15
    }
  }
};

export { emptyState, twoSampleState };
