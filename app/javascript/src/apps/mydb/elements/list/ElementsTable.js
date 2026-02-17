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

import UserStore from 'src/stores/alt/stores/UserStore';
import ElementsTableGroupedEntries from 'src/apps/mydb/elements/list/ElementsTableGroupedEntries';
import { Select } from 'src/components/common/Select';
import PropTypes from 'prop-types';
import CellLineContainer from 'src/apps/mydb/elements/list/cellLine/CellLineContainer';
import VesselContainer from 'src/apps/mydb/elements/list/vessel/VesselContainer';
import VesselTemplateGroupView from 'src/apps/mydb/elements/list/vessel/VesselTemplateGroupView';
import DeviceDescriptionList from 'src/apps/mydb/elements/list/deviceDescriptions/DeviceDescriptionList';
import DeviceDescriptionListHeader from 'src/apps/mydb/elements/list/deviceDescriptions/DeviceDescriptionListHeader';
import SequenceBasedMacromoleculeSampleList from 'src/apps/mydb/elements/list/sequenceBasedMacromoleculeSamples/SequenceBasedMacromoleculeSampleList';
import SequenceBasedMacromoleculeSampleListHeader from 'src/apps/mydb/elements/list/sequenceBasedMacromoleculeSamples/SequenceBasedMacromoleculeSampleListHeader';

export default class ElementsTable extends React.Component {
  constructor(props) {
    super(props);
    this.elementRef = React.createRef();

    const { type } = props;
    const { groupCollapse } = UIStore.getState();

    this.state = {
      elements: [],
      ui: {},
      isGroupBaseCollapsed: groupCollapse[type]?.baseState === 'collapsed',
      moleculeSort: false,
      searchResult: false,
      productOnly: false,
      page: null,
      pages: null,
      elementsGroup: 'none',
      elementsSort: true,
      sortDirection: 'DESC',
    };

    this.onChange = this.onChange.bind(this);
    this.onChangeUI = this.onChangeUI.bind(this);

    this.changeDateFilter = this.changeDateFilter.bind(this);

    this.toggleProductOnly = this.toggleProductOnly.bind(this);
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

  changeElementsGroup = ({ value: elementsGroup }) => {
    const { type } = this.props;
    const { elementsSort, sortDirection } = this.state;

    this.setState({
      elementsGroup,
      elementsSort,
    }, () => {
      UIActions.resetGroupCollapse({ type });
      this.updateFilterAndUserProfile(elementsSort, sortDirection, elementsGroup);
    });
  };

  changeElementsSort = () => {
    const { type } = this.props;
    const { elementsGroup, sortDirection } = this.state;
    let { elementsSort } = this.state;
    elementsSort = !elementsSort;

    this.setState({
      elementsSort
    }, () => {
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

    const onClick = isGroupBaseCollapsed
      ? () => UIActions.expandAllGroups({ type })
      : () => UIActions.collapseAllGroups({ type });

    return (
      <button
        type="button"
        onClick={onClick}
        className={`accordion-button accordion-button--icon-only${isGroupBaseCollapsed ? ' collapsed' : ''}`}
      >
        &nbsp;
      </button>
    );
  };

  changeDateFilter() {
    let { filterCreatedAt } = this.state;
    filterCreatedAt = !filterCreatedAt;
    UIActions.setFilterCreatedAt(filterCreatedAt);
  }

  toggleProductOnly() {
    const { productOnly } = this.state;
    UIActions.setProductOnly(!productOnly);
  }

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
      productOnly,
    } = this.state;

    const options = [
      { value: false, label: 'Grouped by Sample' },
      { value: true, label: 'Grouped by Molecule' }
    ];
    const tooltipText = productOnly ? 'Show all' : 'Show products only';

    return (
      <>
        <Select
          options={options}
          isClearable={false}
          value={options.find(({ value }) => value === moleculeSort)}
          onChange={this.changeSampleSort}
          size="sm"
        />
        <OverlayTrigger
          placement="top"
          overlay={<Tooltip id="showProductsOnly">{tooltipText}</Tooltip>}
        >
          <Button
            size="sm"
            onClick={this.toggleProductOnly}
            variant={productOnly ? 'primary' : 'light'}
          >
            <i
              className="fa fa-product-hunt"
            />
          </Button>
        </OverlayTrigger>
      </>
    );
  };

  renderChangeSortDirectionIcon = () => {
    const { sortDirection } = this.state;
    const sortDirectionIcon = sortDirection === 'ASC' ? 'fa-long-arrow-up' : 'fa-long-arrow-down';
    const changeSortDirectionTitle = sortDirection === 'ASC' ? 'change to descending' : 'change to ascending';
    const sortDirectionTooltip = <Tooltip id="change_sort_direction">{changeSortDirectionTitle}</Tooltip>;
    return (
      <OverlayTrigger placement="top" overlay={sortDirectionTooltip}>
        <button
          type="button"
          style={{ border: 'none' }}
          onClick={this.changeSortDirection}
        >
          <i className={`fa fa-fw ${sortDirectionIcon}`} />
        </button>
      </OverlayTrigger>
    );
  };

  renderReactionsHeader = () => {
    const { elementsGroup, elementsSort, sortDirection } = this.state;
    const optionsHash = {
      none: { sortColumn: 'create date', label: 'List' },
      rinchi_short_key: { sortColumn: 'RInChI', label: 'Grouped by RInChI' },
      rxno: { sortColumn: 'type', label: 'Grouped by type' },
    };
    const options = Object.entries(optionsHash).map((option) => ({
      value: option[0],
      label: option[1].label
    }));

    const { sortColumn } = optionsHash[elementsGroup];
    const sortDirectionText = sortDirection === 'ASC' ? 'ascending' : 'descending';
    const sortTitle = elementsSort
      ? `click to sort by update date (${sortDirectionText}) - currently sorted by ${sortColumn} (${sortDirectionText})`
      : `click to sort by ${sortColumn} (${sortDirectionText})`
      + ` - currently sorted by update date (${sortDirectionText})`;
    const sortTooltip = <Tooltip id="reaction_sort_tooltip">{sortTitle}</Tooltip>;
    let sortIconClass = 'fa-clock-o';
    if (elementsGroup !== 'none') {
      sortIconClass = elementsSort ? 'fa-sort-alpha-desc' : 'fa-clock-o';
    } else {
      sortIconClass = elementsSort ? 'fa-history' : 'fa-clock-o';
    }
    const sortIcon = <i className={`fa fa-fw ${sortIconClass}`} />;
    const sortContent = (
      <OverlayTrigger placement="top" overlay={sortTooltip}>
        <button
          type="button"
          style={{ border: 'none' }}
          onClick={this.changeElementsSort}
        >
          {sortIcon}
        </button>
      </OverlayTrigger>
    );

    return (
      <>
        <Select
          simpleValue
          options={options}
          clearable={false}
          searchable={false}
          value={options.find(({ value }) => value == elementsGroup)}
          onChange={this.changeElementsGroup}
          className="header-group-select"
          size="sm"
        />
        {sortContent}
        {this.renderChangeSortDirectionIcon()}
      </>
    );
  };

  renderGenericElementsHeader = () => {
    const { elementsGroup, elementsSort } = this.state;
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
    const { sortColumn } = optionsHash[elementsGroup] || optionsHash.none;
    const sortTitle = elementsSort ? `sort by ${sortColumn}` : 'sort by update date';
    const sortTooltip = <Tooltip id="reaction_sort_tooltip">{sortTitle}</Tooltip>;
    const sortIconClass = elementsSort ? 'fa-sort-alpha-desc' : 'fa-clock-o';
    const sortIcon = <i className={`fa fa-fw ${sortIconClass}`} />;
    const sortContent = (
      <OverlayTrigger placement="top" overlay={sortTooltip}>
        <button
          type="button"
          style={{ border: 'none' }}
          onClick={this.changeElementsSort}
        >
          {sortIcon}
        </button>
      </OverlayTrigger>
    );

    return (
      <>
        <Select
          options={options}
          isClearable={false}
          value={options.find(({ value }) => value == elementsGroup)}
          onChange={this.changeElementsGroup}
          className="header-group-select"
          size="sm"
        />
        {elementsGroup !== 'none' ? (sortContent) : null}
      </>
    );
  };

  renderVesselsHeader = () => {
    const { elementsGroup, elementsSort, sortDirection } = this.state;

    const optionsHash = {
      none: { sortColumn: 'create date', label: 'List' },
      by_template: { sortColumn: 'template name', label: 'Grouped by Template (All)' }, // NEW
    };

    const options = Object.entries(optionsHash).map(([value, config]) => ({
      value,
      label: config.label,
    }));

    const { sortColumn } = optionsHash[elementsGroup];
    const sortTitle = elementsSort
      ? `Sort by ${sortColumn} (${sortDirection})`
      : `Sort by update date (${sortDirection})`;
    const sortTooltip = <Tooltip id="vessel_sort_tooltip">{sortTitle}</Tooltip>;

    const sortIconClass = elementsSort ? 'fa-sort-alpha-desc' : 'fa-clock-o';
    const sortIcon = <i className={`fa fa-fw ${sortIconClass}`} />;

    return (
      <>
        <Select
          options={options}
          isClearable={false}
          value={options.find(({ value }) => value === elementsGroup)}
          onChange={this.changeElementsGroup}
          className="header-group-select"
          size="sm"
        />
        <OverlayTrigger placement="top" overlay={sortTooltip}>
          <button type="button" style={{ border: 'none' }} onClick={this.changeElementsSort}>
            {sortIcon}
          </button>
        </OverlayTrigger>
        {elementsGroup !== 'none' ? this.collapseButton() : null}
      </>
    );
  };


  renderHeader = () => {
    const { filterCreatedAt, ui, elementsGroup } = this.state;
    const { type, genericEl } = this.props;
    const { fromDate, toDate, userLabel } = ui;

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

    const searchLabel = <SearchUserLabels userLabel={userLabel} fnCb={this.setUserLabel} size="sm" />;

    const filterTitle = filterCreatedAt === true
      ? 'click to filter by update date - currently filtered by creation date'
      : 'click to filter by creation date - currently filtered by update date';
    const filterIconClass = filterCreatedAt === true ? 'fa-calendar' : 'fa-calendar-o';

    const filterTooltip = <Tooltip id="date_tooltip">{filterTitle}</Tooltip>;
    const filterIcon = <i className={`fa ${filterIconClass}`} />;

    return (
      <div className="elements-table-header gap-1">
        <ElementAllCheckbox type={type} />
        <div className="d-flex gap-1 align-items-center">
          <div className="elements-table-header__filters">
            {searchLabel}
            <InputGroup className="elements-table-header__date-filter" size="sm">
              <OverlayTrigger placement="top" overlay={filterTooltip}>
                <Button
                  onClick={this.changeDateFilter}
                >
                  {filterIcon}
                </Button>
              </OverlayTrigger>
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
            {typeSpecificHeader}
          </div>
          {(displayCollapseButton || elementsGroup !== 'none') && this.collapseButton()}
        </div>
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
