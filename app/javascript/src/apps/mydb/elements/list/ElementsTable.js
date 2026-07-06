/* eslint-disable camelcase */
import React from 'react';

import {
  Button, Pagination, Form, InputGroup, Tooltip, OverlayTrigger
} from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import deepEqual from 'deep-equal';

import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import UserActions from 'src/stores/alt/actions/UserActions';

import ElementStore from 'src/stores/alt/stores/ElementStore';
import ElementAllCheckbox from 'src/apps/mydb/elements/list/ElementAllCheckbox';
import ElementsTableEntries from 'src/apps/mydb/elements/list/ElementsTableEntries';
import SampleGroupContainer from 'src/apps/mydb/elements/list/sample/SampleGroupContainer';
import { SearchUserLabels } from 'src/components/UserLabels';
import ToggleButton from 'src/components/common/ToggleButton';

import UserStore from 'src/stores/alt/stores/UserStore';
import ElementsTableGroupedEntries from 'src/apps/mydb/elements/list/ElementsTableGroupedEntries';
import { Select } from 'src/components/common/Select';
import PropTypes from 'prop-types';
import CellLineContainer from 'src/apps/mydb/elements/list/cellLine/CellLineContainer';
import VesselContainer from 'src/apps/mydb/elements/list/vessel/VesselContainer';
import VesselTemplateGroupView from 'src/apps/mydb/elements/list/vessel/VesselTemplateGroupView';
import DeviceDescriptionList from 'src/apps/mydb/elements/list/deviceDescriptions/DeviceDescriptionList';
import DeviceDescriptionListHeader from 'src/apps/mydb/elements/list/deviceDescriptions/DeviceDescriptionListHeader';
import SequenceBasedMacromoleculeSampleList
  from 'src/apps/mydb/elements/list/sequenceBasedMacromoleculeSamples/SequenceBasedMacromoleculeSampleList';
import SequenceBasedMacromoleculeSampleListHeader
  from 'src/apps/mydb/elements/list/sequenceBasedMacromoleculeSamples/SequenceBasedMacromoleculeSampleListHeader';

const SORT_MODE_OPTIONS = [
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' }
];

export default class ElementsTable extends React.Component {
  constructor(props) {
    super(props);
    this.elementRef = React.createRef();

    const { type } = props;
    const {
      groupCollapse, fromDate, toDate, userLabel, productOnly,
    } = UIStore.getState();
    const hasPersistedFilters = !!(userLabel || fromDate || toDate || productOnly);

    this.state = {
      elements: [],
      ui: {},
      isGroupBaseCollapsed: groupCollapse[type]?.baseState === 'collapsed',
      moleculeSort: false,
      searchResult: false,
      productOnly: false,
      showFilters: hasPersistedFilters,
      page: null,
      pages: null,
      elementsGroup: 'none',
      elementsSort: true,
      sortDirection: 'DESC',
    };

    this.onChange = this.onChange.bind(this);
    this.onChangeUI = this.onChangeUI.bind(this);

    this.setUserLabel = this.setUserLabel.bind(this);
    this.setFromDate = this.setFromDate.bind(this);
    this.setToDate = this.setToDate.bind(this);
    this.timer = null;
  }

  componentDidMount() {
    ElementStore.listen(this.onChange);
    this.onChange(ElementStore.getState());

    UIStore.listen(this.onChangeUI);
    this.onChangeUI(UIStore.getState());

    const { type, genericEl } = this.props;
    if (type === 'reaction' || genericEl) {
      const userState = UserStore.getState();
      const filters = userState.profile.data.filters || {};

      const { elementsGroup, elementsSort, sortDirection } = this.state;
      const newElementsGroup = filters[type]?.group || 'none';
      const newElementsSort = filters[type]?.sort ?? true;
      const newSortDirection = filters[type]?.direction || 'DESC';

      if (newElementsGroup !== elementsGroup
        || newElementsSort !== elementsSort
        || newSortDirection !== sortDirection) {
        this.setState({
          elementsGroup: newElementsGroup,
          elementsSort: newElementsSort,
          sortDirection: newSortDirection,
        });
      }
    }
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onChange);
    UIStore.unlisten(this.onChangeUI);
  }

  handlePaginationSelect(eventKey) {
    const { pages } = this.state;
    const { type } = this.props;

    if (eventKey > 0 && eventKey <= pages) {
      this.setState({
        page: eventKey
      }, () => {
        const { page } = this.state;
        UIActions.setPagination({ type, page });
        this.handleScrollToElement(this.elementRef);
      });
    }
  }

  handleScrollToElement = () => {
    if (this.elementRef.current) {
      this.elementRef.current.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  };

  handleNumberOfResultsChange(event) {
    const { value } = event.target;
    if (parseInt(value, 10) > 0) {
      UIActions.changeNumberOfResultsShown(value);
      this.handleDelayForNumberOfResults();
    }
  }

  handleDelayForNumberOfResults() {
    const { type } = this.props;

    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      ElementActions.refreshElements(type);
    }, 900);
  }

  onChangeUI(state) {
    const { type } = this.props;
    if (typeof state[type] === 'undefined' || state[type] === null) {
      return;
    }
    const {
      filterCreatedAt,
      fromDate,
      toDate,
      userLabel,
      number_of_results,
      currentSearchByID,
      productOnly,
      groupCollapse,
    } = state;

    // check if element details of any type are open at the moment
    const currentId = state.sample.currentId || state.reaction.currentId
      || state.wellplate.currentId;

    const isSearchResult = !!currentSearchByID;

    const { currentStateProductOnly, searchResult } = this.state;
    const stateChange = (
      currentId || filterCreatedAt
      || fromDate || toDate || userLabel || productOnly !== currentStateProductOnly
      || isSearchResult !== searchResult
    );
    const moleculeSort = isSearchResult ? true : ElementStore.getState().moleculeSort;

    if (stateChange) {
      this.setState({
        filterCreatedAt,
        ui: {
          currentId,
          number_of_results,
          fromDate,
          toDate,
          userLabel,
        },
        isGroupBaseCollapsed: groupCollapse[type]?.baseState === 'collapsed',
        productOnly,
        searchResult: isSearchResult,
        moleculeSort
      });
    }
  }

  onChange(state) {
    const { type } = this.props;
    const elementsState = (state && state.elements && state.elements[`${type}s`]) || {};
    const { elements, page, pages } = elementsState;

    const { elements: stateElements } = this.state;
    if (elements && !deepEqual(elements, stateElements)) {
      this.setState({
        page,
        pages,
        elements,
      });
    }
  }

  setUserLabel(label) {
    const { userLabel } = this.state;
    if (userLabel !== label) UIActions.setUserLabel(label);
  }

  setFromDate(date) {
    const { fromDate } = this.state;
    if (fromDate !== date) UIActions.setFromDate(date);
  }

  setToDate(date) {
    const { toDate } = this.state;
    if (toDate !== date) UIActions.setToDate(date);
  }

  changeSampleSort = () => {
    let { moleculeSort } = this.state;
    moleculeSort = !moleculeSort;

    this.setState({
      moleculeSort,
    }, () => {
      ElementActions.changeSorting(moleculeSort);
      UIActions.resetGroupCollapse({ type: 'sample' });
    });
  };

  updateFilterAndUserProfile = (elementsSort, sortDirection, elementsGroup) => {
    const { type } = this.props;

    ElementActions.changeElementsFilter({
      name: type,
      sort: elementsSort,
      direction: sortDirection,
      group: elementsGroup,
    });

    UserActions.updateUserProfile({
      data: {
        filters: {
          [type]: {
            sort: elementsSort,
            direction: sortDirection,
            group: elementsGroup,
          },
        },
      },
    });
  };

  changeElementsGroup = (selectedOption) => {
    const { type } = this.props;
    const { elementsSort, sortDirection } = this.state;
    const elementsGroup = selectedOption?.value ?? selectedOption;

    if (!elementsGroup) return;

    this.setState({
      elementsGroup,
      elementsSort,
    }, () => {
      UIActions.resetGroupCollapse({ type });
      this.updateFilterAndUserProfile(elementsSort, sortDirection, elementsGroup);
    });
  };

  changeElementsSortMode = (selectedOption) => {
    const { type } = this.props;
    const { elementsGroup, sortDirection } = this.state;
    const value = selectedOption?.value ?? selectedOption;

    if (!value) return;

    const elementsSort = value === 'created';

    this.setState({ elementsSort }, () => {
      UIActions.resetGroupCollapse({ type });
      this.updateFilterAndUserProfile(elementsSort, sortDirection, elementsGroup);
    });
  };

  changeSortDirection = () => {
    const { type } = this.props;
    const { elementsGroup, elementsSort, sortDirection } = this.state;
    const newSortDirection = sortDirection === 'DESC' ? 'ASC' : 'DESC';

    this.setState(
      { sortDirection: newSortDirection },
      () => {
        UIActions.resetGroupCollapse({ type });
        this.updateFilterAndUserProfile(elementsSort, newSortDirection, elementsGroup);
      }
    );
  };

  collapseButton = () => {
    const { isGroupBaseCollapsed } = this.state;
    const { type } = this.props;
    const ariaLabel = isGroupBaseCollapsed ? 'Expand all groups' : 'Collapse all groups';

    const onClick = isGroupBaseCollapsed
      ? () => UIActions.expandAllGroups({ type })
      : () => UIActions.collapseAllGroups({ type });

    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={`accordion-button accordion-button--icon-only${isGroupBaseCollapsed ? ' collapsed' : ''}`}
      >
        &nbsp;
      </button>
    );
  };

  hasActiveFilters = () => {
    const { ui, productOnly } = this.state;
    const { fromDate, toDate, userLabel } = ui;
    return !!(userLabel || fromDate || toDate || productOnly);
  };

  toggleFilters = () => {
    this.setState((prevState) => ({ showFilters: !prevState.showFilters }));
  };

  clearFilters = () => {
    const { ui, productOnly } = this.state;
    const { fromDate, toDate, userLabel } = ui;

    if (userLabel) UIActions.setUserLabel(null);
    if (fromDate) UIActions.setFromDate(null);
    if (toDate) UIActions.setToDate(null);
    if (productOnly) UIActions.setProductOnly(false);
  };

  renderNumberOfResultsInput() {
    const { ui } = this.state;
    return (
      <Form className="w-25 ms-1">
        <InputGroup>
          <InputGroup.Text>Show</InputGroup.Text>
          <Form.Control
            type="text"
            onChange={(event) => this.handleNumberOfResultsChange(event)}
            value={ui.number_of_results ?? 0}
          />
        </InputGroup>
      </Form>
    );
  }

  renderPagination() {
    const { page, pages } = this.state;

    const minPage = Math.max(page - 2, 1);
    const maxPage = Math.min(minPage + 4, pages);

    const items = [];
    for (let currentPage = minPage; currentPage <= maxPage; currentPage += 1) {
      items.push(
        <Pagination.Item
          key={`eltPage${currentPage}`}
          active={currentPage === page}
          onClick={() => this.handlePaginationSelect(currentPage)}
        >
          {currentPage}
        </Pagination.Item>
      );
    }

    return pages > 1 && (
      <Pagination className="m-0">
        <Pagination.First disabled={page === 1} onClick={() => this.handlePaginationSelect(1)} />
        <Pagination.Prev disabled={page === 1} onClick={() => this.handlePaginationSelect(page - 1)} />
        {items}
        {pages > maxPage && (<Pagination.Ellipsis />)}
        <Pagination.Next disabled={page === pages} onClick={() => this.handlePaginationSelect(page + 1)} />
        <Pagination.Last disabled={page === pages} onClick={() => this.handlePaginationSelect(pages)} />
      </Pagination>
    );
  }

  renderSamplesHeader = () => {
    const {
      moleculeSort,
    } = this.state;

    const options = [
      { value: false, label: 'Grouped by Sample' },
      { value: true, label: 'Grouped by Molecule' }
    ];

    return (
      <Select
        options={options}
        isClearable={false}
        value={options.find(({ value }) => value === moleculeSort)}
        onChange={this.changeSampleSort}
        size="sm"
        variant="secondary"
      />
    );
  };

  renderChangeSortDirectionIcon = () => {
    const { sortDirection } = this.state;
    const sortDirectionIcon = sortDirection === 'ASC' ? 'fa-long-arrow-up' : 'fa-long-arrow-down';
    const changeSortDirectionTitle = sortDirection === 'ASC' ? 'change to descending' : 'change to ascending';
    return (
      <Button
        size="sm"
        variant="secondary"
        title={changeSortDirectionTitle}
        onClick={this.changeSortDirection}
      >
        <i className={`fa ${sortDirectionIcon}`} />
      </Button>
    );
  };

  renderSortControls = ({ showDirection = true } = {}) => {
    const { elementsSort } = this.state;
    const sortModeValue = SORT_MODE_OPTIONS.find(({ value }) => (
      elementsSort ? value === 'created' : value === 'updated'
    ));

    return (
      <InputGroup size="sm" className="flex-nowrap w-auto">
        <Select
          options={SORT_MODE_OPTIONS}
          isClearable={false}
          value={sortModeValue}
          onChange={this.changeElementsSortMode}
          size="sm"
          variant="secondary"
        />
        {showDirection ? this.renderChangeSortDirectionIcon() : null}
      </InputGroup>
    );
  };

  renderReactionsHeader = () => {
    const { elementsGroup } = this.state;
    const optionsHash = {
      none: { sortColumn: 'create date', label: 'List' },
      rinchi_short_key: { sortColumn: 'RInChI', label: 'Grouped by RInChI' },
      rxno: { sortColumn: 'type', label: 'Grouped by type' },
    };
    const options = Object.entries(optionsHash).map((option) => ({
      value: option[0],
      label: option[1].label
    }));
    return (
      <>
        <Select
          simpleValue
          options={options}
          clearable={false}
          searchable={false}
          value={options.find(({ value }) => value === elementsGroup)}
          onChange={this.changeElementsGroup}
          className="header-group-select"
          size="sm"
          variant="secondary"
        />
        {this.renderSortControls()}
      </>
    );
  };

  renderGenericElementsHeader = () => {
    const { elementsGroup } = this.state;
    const { genericEl } = this.props;

    if (!genericEl.properties_release) return null;

    const optionsHash = {
      none: { sortColumn: 'update date', label: 'List' },
    };
    const { layers } = genericEl.properties_release;
    const allowedTypes = [
      'select',
      'text',
      'integer',
      'system-defined',
      'textarea'
    ];

    Object.entries(layers).forEach((layerEntry) => {
      layerEntry[1].fields
        .filter((field) => (allowedTypes.includes(field.type)))
        .forEach((field) => {
          if (Object.keys(optionsHash).length < 11) {
            optionsHash[`${layerEntry[0]}.${field.field}`] = {
              sortColumn: field.label,
              label: field.label
            };
          }
        });
    });
    const options = Object.entries(optionsHash).map((option, index) => {
      const label = index === 0 ? option[1].label : `Grouped by ${option[1].label}`;

      return { value: option[0], label };
    });

    if (!optionsHash[elementsGroup]) {
      // you are not able to use this.setState because this would rerender it again and again ...
      // eslint-disable-next-line react/no-direct-mutation-state
      this.state.elementsGroup = 'none';
    }
    return (
      <>
        <Select
          options={options}
          isClearable={false}
          value={options.find(({ value }) => value === elementsGroup)}
          onChange={this.changeElementsGroup}
          className="header-group-select"
          size="sm"
          variant="secondary"
        />
        {elementsGroup !== 'none' ? this.renderSortControls({ showDirection: false }) : null}
      </>
    );
  };

  renderVesselsHeader = () => {
    const { elementsGroup } = this.state;

    const optionsHash = {
      none: { sortColumn: 'create date', label: 'List' },
      by_template: { sortColumn: 'template name', label: 'Grouped by Template (All)' }, // NEW
    };

    const options = Object.entries(optionsHash).map(([value, config]) => ({
      value,
      label: config.label,
    }));
    return (
      <>
        <Select
          options={options}
          isClearable={false}
          value={options.find(({ value }) => value === elementsGroup)}
          onChange={this.changeElementsGroup}
          className="header-group-select"
          size="sm"
          variant="secondary"
        />
        {this.renderSortControls()}
        {elementsGroup !== 'none' ? this.collapseButton() : null}
      </>
    );
  };

  renderHeader = () => {
    const {
      showFilters,
      elementsGroup,
    } = this.state;
    const { type, genericEl } = this.props;

    let typeSpecificHeader = null;
    let displayCollapseButton = false;
    if (type === 'sample') {
      typeSpecificHeader = this.renderSamplesHeader();
      displayCollapseButton = true;
    } else if (type === 'reaction') {
      typeSpecificHeader = this.renderReactionsHeader();
    } else if (type === 'device_description') {
      typeSpecificHeader = <DeviceDescriptionListHeader />;
      displayCollapseButton = true;
    } else if (type === 'cell_line') {
      displayCollapseButton = true;
    } else if (type === 'sequence_based_macromolecule_sample') {
      typeSpecificHeader = <SequenceBasedMacromoleculeSampleListHeader />;
      displayCollapseButton = true;
    } else if (genericEl) {
      typeSpecificHeader = this.renderGenericElementsHeader();
    } else if (type === 'vessel') {
      typeSpecificHeader = this.renderVesselsHeader();
    }
    const hasActiveFilters = this.hasActiveFilters();
    let filterToggleTitle = showFilters ? 'Hide filters' : 'Show filters';
    if (hasActiveFilters) filterToggleTitle += ' (filters active)';

    return (
      <div className="elements-table-header gap-1">
        <ElementAllCheckbox type={type} />
        <div className="d-flex gap-1 align-items-center">
          <div className="elements-table-header__display-settings">
            {typeSpecificHeader}
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id="filters_toggle_tooltip">{filterToggleTitle}</Tooltip>}
            >
              <Button
                className={`elements-table-header__filters-toggle-btn${hasActiveFilters ? ' has-active-filters' : ''}`}
                size="sm"
                variant={hasActiveFilters ? 'primary' : 'secondary'}
                onClick={this.toggleFilters}
                active={showFilters}
                aria-expanded={showFilters}
                aria-controls={`elements-table-filters-${type}`}
                aria-label="Toggle filters"
              >
                <i className="fa fa-filter" />
              </Button>
            </OverlayTrigger>
          </div>
          {(displayCollapseButton || elementsGroup !== 'none') && this.collapseButton()}
        </div>
      </div>
    );
  };

  renderFilters = () => {
    const {
      filterCreatedAt,
      ui,
      showFilters,
      productOnly,
    } = this.state;
    const { type } = this.props;
    const { fromDate, toDate, userLabel } = ui;

    if (!showFilters) {
      return null;
    }

    const hasActiveFilters = this.hasActiveFilters();
    const searchLabel = <SearchUserLabels userLabel={userLabel} fnCb={this.setUserLabel} size="sm" />;

    const DATE_FILTER_OPTIONS = [
      { value: true, label: 'Created' },
      { value: false, label: 'Updated' },
    ];
    const dateFilterValue = DATE_FILTER_OPTIONS.find(({ value }) => value === filterCreatedAt);

    return (
      <div id={`elements-table-filters-${type}`} className="elements-table-filters">
        <div className="d-flex align-items-center gap-2">
          {searchLabel}
          <InputGroup className="elements-table-header__date-filter" size="sm">
            <Select
              options={DATE_FILTER_OPTIONS}
              isClearable={false}
              value={dateFilterValue}
              onChange={(opt) => UIActions.setFilterCreatedAt(opt?.value ?? opt)}
              size="sm"
            />
            <DatePicker
              selected={fromDate}
              placeholderText="From"
              onChange={this.setFromDate}
              popperPlacement="bottom-start"
              popperModifiers={[{
                name: 'prevent-flip',
                fn: () => ({ reset: { placement: 'bottom-start' } })
              }]}
              isClearable
              dateFormat="dd-MM-YY"
            />
            <DatePicker
              selected={toDate}
              placeholderText="To"
              popperPlacement="bottom"
              popperModifiers={[{
                name: 'prevent-flip',
                fn: () => ({ reset: { placement: 'bottom' } })
              }]}
              onChange={this.setToDate}
              isClearable
              dateFormat="dd-MM-YY"
            />
          </InputGroup>
          {(type === 'sample') ? (
            <ToggleButton
              isToggledInitial={productOnly}
              onToggle={(isToggled) => UIActions.setProductOnly(isToggled)}
              onLabel="Products only"
              offLabel="Products only"
              tooltipOn="Remove products only filter"
              tooltipOff="Apply products only filter"
              showIcon
              size="sm"
            />
          ) : null}
        </div>
        {hasActiveFilters && (
          <Button
            size="sm"
            variant="light"
            onClick={this.clearFilters}
          >
            <i className="fa fa-times-circle me-1" />
            Clear
          </Button>
        )}
      </div>
    );
  };

  renderEntries() {
    const {
      elements,
      moleculeSort,
      elementsGroup,
    } = this.state;

    const { type, genericEl } = this.props;
    let elementsTableEntries;

    if (type === 'sample') {
      elementsTableEntries = (
        <SampleGroupContainer
          elements={elements}
          moleculeSort={moleculeSort}
        />
      );
    } else if ((type === 'reaction' || genericEl) && elementsGroup !== 'none') {
      elementsTableEntries = (
        <ElementsTableGroupedEntries
          elements={elements}
          elementsGroup={elementsGroup}
          type={type}
        />
      );
    } else if (type === 'cell_line') {
      elementsTableEntries = (
        <CellLineContainer
          elements={elements}
        />
      );
    } else if (type === 'device_description') {
      elementsTableEntries = (
        <DeviceDescriptionList
          elements={elements}
        />
      );
    } else if (type === 'vessel') {
      if (elementsGroup === 'by_template') {
        elementsTableEntries = (
          <VesselTemplateGroupView elements={elements} />
        );
      } else {
        elementsTableEntries = (
          <VesselContainer
            vesselGroups={elements}
          />
        );
      }
    } else if (type === 'sequence_based_macromolecule_sample') {
      elementsTableEntries = (
        <SequenceBasedMacromoleculeSampleList
          elements={elements}
        />
      );
    } else {
      elementsTableEntries = (
        <ElementsTableEntries
          elements={elements}
        />
      );
    }

    return (
      <div ref={this.elementRef} className="flex-grow-1 h-0 overflow-y-auto pb-3 surface-tab__content">
        {elementsTableEntries}
        <div className="mt-2 d-flex justify-content-between">
          {this.renderPagination()}
          {this.renderNumberOfResultsInput()}
        </div>
      </div>
    );
  }

  render() {
    return (
      <div className="list-container d-flex flex-column h-100">
        {this.renderHeader()}
        {this.renderFilters()}
        {this.renderEntries()}
      </div>
    );
  }
}

ElementsTable.defaultProps = {
  genericEl: null,
};

ElementsTable.propTypes = {
  type: PropTypes.string.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  genericEl: PropTypes.object,
};
