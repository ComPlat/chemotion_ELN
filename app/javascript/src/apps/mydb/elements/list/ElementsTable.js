/* eslint-disable camelcase */
import React from 'react';

import {
  Pagination, Form, InputGroup, Tooltip, OverlayTrigger
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
import ElementsTableSampleEntries from 'src/apps/mydb/elements/list/ElementsTableSampleEntries';
import { SearchUserLabels } from 'src/components/UserLabels';

import UserStore from 'src/stores/alt/stores/UserStore';
import ElementsTableGroupedEntries from 'src/apps/mydb/elements/list/ElementsTableGroupedEntries';
import { Select } from 'src/components/common/Select';
import PropTypes from 'prop-types';
import CellLineGroup from 'src/models/cellLine/CellLineGroup';
import CellLineContainer from 'src/apps/mydb/elements/list/cellLine/CellLineContainer';
import ChevronIcon from 'src/components/common/ChevronIcon';
import DeviceDescriptionList from 'src/apps/mydb/elements/list/deviceDescriptions/DeviceDescriptionList';
import DeviceDescriptionListHeader from 'src/apps/mydb/elements/list/deviceDescriptions/DeviceDescriptionListHeader';
import { getDisplayedMoleculeGroup, getMoleculeGroupsShown } from 'src/utilities/SampleUtils'

export default class ElementsTable extends React.Component {
  constructor(props) {
    super(props);
    this.elementRef = React.createRef();

    this.state = {
      elements: [],
      currentElement: null,
      ui: {},
      collapseAll: false,
      moleculeGroupsShown: [],
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
      this.elementRef.current.scrollTo({ top: 0, left: 0, behavior: "smooth", });
    }
  };

  onChangeUI(state) {
    const { type } = this.props;
    if (typeof state[type] === 'undefined' || state[type] === null) {
      return;
    }
    const { checkedIds, uncheckedIds, checkedAll } = state[type];
    const {
      filterCreatedAt, fromDate, toDate, userLabel, number_of_results, currentSearchByID, productOnly
    } = state;

    // check if element details of any type are open at the moment
    const currentId = state.sample.currentId || state.reaction.currentId
      || state.wellplate.currentId;

    let isSearchResult = currentSearchByID ? true : false;

    const { currentStateProductOnly, searchResult } = this.state;
    const stateChange = (
      checkedIds || uncheckedIds || checkedAll || currentId || filterCreatedAt
      || fromDate || toDate || userLabel || productOnly !== currentStateProductOnly
      || isSearchResult !== searchResult
    );
    const moleculeSort = isSearchResult ? true : ElementStore.getState().moleculeSort;

    if (stateChange) {
      this.setState({
        filterCreatedAt,
        ui: {
          checkedIds,
          uncheckedIds,
          checkedAll,
          currentId,
          number_of_results,
          fromDate,
          toDate,
          userLabel,
        },
        productOnly,
        searchResult: isSearchResult,
        moleculeSort: moleculeSort
      });
    }
  }

  onChange(state) {
    const { type } = this.props;
    const elementsState = (state && state.elements && state.elements[`${type}s`]) || {};
    const { elements, page, pages } = elementsState;

    let currentElement;
    if (!state.currentElement || state.currentElement.type === type) {
      const { currentElement: stateCurrentElement } = state;
      currentElement = stateCurrentElement;
    }

    const { elements: stateElements, currentElement: stateCurrentElement } = this.state;
    const elementsDidChange = elements && !deepEqual(elements, stateElements);
    const currentElementDidChange = !deepEqual(currentElement, stateCurrentElement);

    const nextState = { page, pages, currentElement };
    if (elementsDidChange) { nextState.elements = elements; }
    if (elementsDidChange || currentElementDidChange) { this.setState(nextState); }
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

  changeCollapse = (collapseAll, childPropName, childPropValue) => {
    this.setState({
        collapseAll: !collapseAll,
        ...(childPropName ? { [childPropName]: childPropValue } : {})
    });
  };

  changeSampleSort = () => {
    let { moleculeSort } = this.state;
    moleculeSort = !moleculeSort;

    this.setState({
      moleculeSort
    }, () => ElementActions.changeSorting(moleculeSort));
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
    const { elementsSort, sortDirection } = this.state;

    this.setState({
      elementsGroup,
      elementsSort,
    }, () => {
      this.updateFilterAndUserProfile(elementsSort, sortDirection, elementsGroup);
    });
  };

  changeElementsSort = () => {
    const { elementsGroup, sortDirection } = this.state;
    let { elementsSort } = this.state;
    elementsSort = !elementsSort;

    this.setState({
      elementsSort
    }, () => {
      this.updateFilterAndUserProfile(elementsSort, sortDirection, elementsGroup);
    });
  };

  changeSortDirection = () => {
    const { elementsGroup, elementsSort, sortDirection } = this.state;
    const newSortDirection = sortDirection === 'DESC' ? 'ASC' : 'DESC';

    this.setState(
      { sortDirection: newSortDirection },
      () => {
        this.updateFilterAndUserProfile(elementsSort, newSortDirection, elementsGroup);
      }
    );
  };

  getMoleculeGroupsShownFromElement = (elements, moleculeSort) => {
    const displayedMoleculeGroup = getDisplayedMoleculeGroup(elements, moleculeSort);
    const moleculeGroupsShown = getMoleculeGroupsShown(displayedMoleculeGroup);
    return moleculeGroupsShown;
  }

  collapseButton = () => {
    const { collapseAll, elements, moleculeSort} = this.state;

    return (
      <ChevronIcon
        direction={collapseAll ? 'right' : 'down'}
        onClick={() => this.setState((prevState) => ({
          collapseAll: !prevState.collapseAll,
         moleculeGroupsShown: !collapseAll ? [] : this.getMoleculeGroupsShownFromElement(elements, moleculeSort)
         }))}
        color="primary"
        className="fs-5"
        role="button"
      />
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
    const items = [];
    const minPage = Math.max(page - 2, 1);
    const maxPage = Math.min(minPage + 4, pages);

    items.push(<Pagination.First key="First" onClick={() => this.handlePaginationSelect(1)} />);
    if (page > 1) {
      items.push(<Pagination.Prev key="Prev" onClick={() => this.handlePaginationSelect(page - 1)} />);
    }
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

    if (pages > maxPage) {
      items.push(<Pagination.Ellipsis key="Ell" />);
    }
    if (page !== pages) {
      items.push(<Pagination.Next key="Next" onClick={() => this.handlePaginationSelect(page + 1)} />);
    }
    items.push(<Pagination.Last key="Last" onClick={() => this.handlePaginationSelect(pages)} />);

    return pages > 1 && (
      <Pagination>
        {items}
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
    const color = productOnly ? '#5cb85c' : 'currentColor';
    const tooltipText = productOnly ? 'Show all' : 'Show products only';

    return (
      <>
        <Select
          options={options}
          isClearable={false}
          value={options.find(({ value }) => value == moleculeSort)}
          onChange={this.changeSampleSort}
        />
        <OverlayTrigger
          placement="top"
          overlay={<Tooltip id="showProductsOnly">{tooltipText}</Tooltip>}
        >
          <button
            type="button"
            className="border-0"
            onClick={this.toggleProductOnly}
            role="button"
          >
            <i
              style={{ color }}
              className="fa fa-lg fa-product-hunt"
            />
          </button>
        </OverlayTrigger>
        {this.collapseButton()}
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
        />
        {sortContent}
        {this.renderChangeSortDirectionIcon()}
        {elementsGroup !== 'none' ? (this.collapseButton()) : null}
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
        />
        {elementsGroup !== 'none' ? (sortContent) : null}
        {elementsGroup !== 'none' ? (this.collapseButton()) : null}
      </>
    );
  };

  renderHeader = () => {
    const { filterCreatedAt, ui, elements } = this.state;
    const { type, genericEl } = this.props;
    const { fromDate, toDate, userLabel } = ui;

    let typeSpecificHeader = null;
    if (type === 'sample') {
      typeSpecificHeader = this.renderSamplesHeader();
    } else if (type === 'reaction') {
      typeSpecificHeader = this.renderReactionsHeader();
    } else if (type === 'device_description') {
      typeSpecificHeader = <DeviceDescriptionListHeader elements={elements} />;
    } else if (genericEl) {
      typeSpecificHeader = this.renderGenericElementsHeader();
    }

    const searchLabel = <SearchUserLabels userLabel={userLabel} fnCb={this.setUserLabel} />;

    const filterTitle = filterCreatedAt === true
      ? 'click to filter by update date - currently filtered by creation date'
      : 'click to filter by creation date - currently filtered by update date';
    const filterIconClass = filterCreatedAt === true ? 'fa-calendar' : 'fa-calendar-o';

    const filterTooltip = <Tooltip id="date_tooltip">{filterTitle}</Tooltip>;
    const filterIcon = <i className={`fa ${filterIconClass}`} />;

    return (
      <div className="elements-table-header">
        <div className="select-all">
          <ElementAllCheckbox
            type={type}
            ui={ui}
          />
        </div>
        <div
          className="header-right d-flex gap-1 align-items-center"
        >
          {searchLabel}
          <OverlayTrigger placement="top" overlay={filterTooltip}>
            <button
              type="button"
              style={{ border: 'none' }}
              onClick={this.changeDateFilter}
            >
              {filterIcon}
            </button>
          </OverlayTrigger>
          <div className="sample-list-from-date">
            <DatePicker
              selected={fromDate}
              placeholderText="From"
              onChange={this.setFromDate}
              popperPlacement="bottom-start"
              isClearable
              dateFormat="dd-MM-YY"
            />
          </div>
          <div className="sample-list-to-date">
            <DatePicker
              selected={toDate}
              placeholderText="To"
              popperPlacement="bottom"
              onChange={this.setToDate}
              isClearable
              dateFormat="dd-MM-YY"
            />
          </div>
          {typeSpecificHeader}
        </div>
      </div>
    );
  };

  renderEntries() {
    const {
      elements,
      ui,
      currentElement,
      collapseAll,
      moleculeSort,
      elementsGroup,
      moleculeGroupsShown
    } = this.state;

    const { overview, type, genericEl } = this.props;
    let elementsTableEntries;

    if (type === 'sample') {
      elementsTableEntries = (
        <ElementsTableSampleEntries
          collapseAll={collapseAll}
          elements={elements}
          currentElement={currentElement}
          showDragColumn={!overview}
          ui={ui}
          moleculeSort={moleculeSort}
          onChangeCollapse={(collapseAll, childPropName, childPropValue) => this.changeCollapse(!collapseAll, childPropName, childPropValue)}
          moleculeGroupsShown = {moleculeGroupsShown}
        />
      );
    } else if ((type === 'reaction' || genericEl) && elementsGroup !== 'none') {
      elementsTableEntries = (
        <ElementsTableGroupedEntries
          collapseAll={collapseAll}
          elements={elements}
          currentElement={currentElement}
          showDragColumn={!overview}
          ui={ui}
          elementsGroup={elementsGroup}
          onChangeCollapse={(checked) => this.changeCollapse(!checked)}
          genericEl={genericEl}
          type={type}
        />
      );
    } else if (type === 'cell_line') {
      elementsTableEntries = (
        <CellLineContainer
          cellLineGroups={CellLineGroup.buildFromElements(elements)}
        />
      );
    } else if (type === 'device_description') {
      elementsTableEntries = (
        <DeviceDescriptionList
          elements={elements}
          currentElement={currentElement}
          ui={ui}
        />
      );
    } else {
      elementsTableEntries = (
        <ElementsTableEntries
          elements={elements}
          currentElement={currentElement}
          showDragColumn={!overview}
          ui={ui}
        />
      );
    }

    return (
      <div ref={this.elementRef} className="elements-list">
        {elementsTableEntries}
      </div>
    );
  }

  render() {
    return (
      <div className="list-container">
        {this.renderHeader()}
        {this.renderEntries()}
        <div className="d-flex flex-row-reverse justify-content-between">
          {this.renderNumberOfResultsInput()}
          {this.renderPagination()}
        </div>
      </div>
    );
  }
}

ElementsTable.defaultProps = {
  genericEl: null,
};

ElementsTable.propTypes = {
  overview: PropTypes.bool.isRequired,
  type: PropTypes.string.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  genericEl: PropTypes.object,
};
