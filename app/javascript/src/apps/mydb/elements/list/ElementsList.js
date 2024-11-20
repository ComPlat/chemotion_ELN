/* eslint-disable camelcase */
import React from 'react';
import Immutable from 'immutable';

import {
  Pagination, Form, InputGroup, Tooltip, OverlayTrigger
} from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import deepEqual from 'deep-equal';
import Aviator from 'aviator';

import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import UserActions from 'src/stores/alt/actions/UserActions';

import ElementStore from 'src/stores/alt/stores/ElementStore';
import ElementAllCheckbox from 'src/apps/mydb/elements/list/ElementAllCheckbox';
import ElementsListEntries from 'src/apps/mydb/elements/list/ElementsListEntries';
import { SearchUserLabels } from 'src/components/UserLabels';

import ElementsListGroupedEntries from 'src/apps/mydb/elements/list/ElementsListGroupedEntries';
import SampleGroupHeader from 'src/apps/mydb/elements/list/sample/SampleGroupHeader';
import SampleGroupElement from 'src/apps/mydb/elements/list/sample/SampleGroupElement';
import GenericGroupHeader from 'src/apps/mydb/elements/list/generic/GenericGroupHeader';
import GenericGroupElement from 'src/apps/mydb/elements/list/generic/GenericGroupElement';
import ReactionGroupHeader from 'src/apps/mydb/elements/list/reaction/ReactionGroupHeader';
import ReactionGroupElement from 'src/apps/mydb/elements/list/reaction/ReactionGroupElement';
import CellLineGroupHeader from 'src/apps/mydb/elements/list/cellLine/CellLineGroupHeader';
import CellLineGroupElement from 'src/apps/mydb/elements/list/cellLine/CellLineGroupElement';

import UserStore from 'src/stores/alt/stores/UserStore';
import { Select } from 'src/components/common/Select';
import PropTypes from 'prop-types';
import ChevronIcon from 'src/components/common/ChevronIcon';
import DeviceDescriptionList from 'src/apps/mydb/elements/list/deviceDescriptions/DeviceDescriptionList';
import DeviceDescriptionListHeader from 'src/apps/mydb/elements/list/deviceDescriptions/DeviceDescriptionListHeader';
import Sheet from 'src/components/common/Sheet';

import { elementShowOrNew } from 'src/utilities/routesUtils';

export default class ElementsList extends React.Component {
  constructor(props) {
    super(props);
    this.elementRef = React.createRef();

    this.state = {
      elements: [],
      currentElement: null,
      ui: {},
      collapse: {
        global: 'expanded',
        except: new Immutable.Set(),
      },
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

    this.showDetails = this.showDetails.bind(this);
    this.isElementSelected = this.isElementSelected.bind(this);

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
    const {
      filterCreatedAt, fromDate, toDate, userLabel, number_of_results, currentSearchByID, productOnly
    } = state;

    // check if element details of any type are open at the moment
    const currentId = state.sample.currentId || state.reaction.currentId
      || state.wellplate.currentId;

    let isSearchResult = currentSearchByID ? true : false;

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
        productOnly,
        searchResult: isSearchResult,
        moleculeSort,
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

  collapseAll = () => {
    this.setState({
      collapse: {
        global: 'collapsed',
        except: new Immutable.Set(),
      },
    });
  };

  expandAll = () => {
    this.setState({
      collapse: {
        global: 'expanded',
        except: new Immutable.Set(),
      },
    });
  };

  toggleGroupCollapsed = (groupKey) => {
    if (this.isGroupCollapsed(groupKey)) {
      this.expandGroup(groupKey);
    } else {
      this.collapseGroup(groupKey);
    }
  };

  collapseGroup = (groupKey) => {
    const { collapse } = this.state;
    const { global, except } = collapse;

    if (global === 'collapsed') {
      this.setState({
        collapse: {
          ...collapse,
          except: except.delete(groupKey),
        }
      });
    } else if (global === 'expanded') {
      this.setState({
        collapse: {
          ...collapse,
          except: except.add(groupKey),
        },
      });
    } else {
      throw new Error(`Unknown collapse state: ${global}`);
    }
  };

  expandGroup = (groupKey) => {
    const { collapse } = this.state;
    const { global, except } = collapse;

    if (global === 'collapsed') {
      this.setState({
        collapse: {
          ...collapse,
          except: except.add(groupKey),
        }
      });
    } else if (global === 'expanded') {
      this.setState({
        collapse: {
          ...collapse,
          except: except.delete(groupKey),
        },
      });
    } else {
      throw new Error(`Unknown collapse state: ${global}`);
    }
  };

  isGroupCollapsed = (groupKey) => {
    const { collapse } = this.state;
    if (collapse.global === 'collapsed') {
      return !collapse.except.has(groupKey);
    }

    if (collapse.global === 'expanded') {
      return collapse.except.has(groupKey);
    }

    throw new Error(`Unknown collapse state: ${collapse.global}`);
  };

  changeSampleSort = () => {
    const { moleculeSort, collapse } = this.state;

    this.setState({
      moleculeSort: !moleculeSort,
      collapse: {
        ...collapse,
        except: new Immutable.Set(),
      }
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
    const { elementsSort, sortDirection, collapse } = this.state;

    this.setState({
      elementsGroup,
      elementsSort,
      collapse: {
        ...collapse,
        except: new Immutable.Set(),
      }
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

  collapseButton = () => {
    const { collapse: { global } } = this.state;

    return (
      <ChevronIcon
        direction={global === 'expanded' ? 'down' : 'right'}
        onClick={global === 'expanded' ? this.collapseAll : this.expandAll}
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

  showDetails(id) {
    const { currentCollection, isSync } = UIStore.getState();
    const { type, genericEl } = this.props;

    const uri = `/${isSync ? 's' : ''}collection/${currentCollection.id}/${type}/${id}`;
    Aviator.navigate(uri, { silent: true });
    const e = {
      type,
      params: {
        [`${type}ID`]: id,
        collectionID: currentCollection.id,
      }
    };

    if (genericEl) {
      e.klassType = 'GenericEl';
    }

    elementShowOrNew(e);
  }

  isElementSelected(element) {
    const { currentElement } = this.state;
    return currentElement?.id === element.id;
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
      <Sheet className="elements-list-header">
        <div className="d-flex gap-1 align-items-center">
          <ElementAllCheckbox type={type} />
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
      </Sheet>
    );
  };

  renderEntries() {
    const {
      elements,
      elementsGroup,
      moleculeSort,
    } = this.state;

    const { overview, type, genericEl } = this.props;
    let elementsTableEntries;

    const renderGrouped = type === 'sample' || type === 'cell_line' ||
      ((type === 'reaction' || !!genericEl) && elementsGroup !== 'none');

    if (renderGrouped) {
      let getGroupKey;
      let headerComponent;
      let elementComponent;

      if (type === 'sample') {
        getGroupKey = (sample) => sample.getMoleculeId();
        headerComponent = SampleGroupHeader;
        elementComponent = SampleGroupElement;
      } else if (type === 'reaction') {
        getGroupKey = (element) => element[elementsGroup];
        headerComponent = ReactionGroupHeader;
        elementComponent = ReactionGroupElement;
      } else if (!!genericEl) {
        const [layer, field] = elementsGroup.split('.');
        const layerFields = genericEl.properties_release?.layers[layer]?.fields || [];
        const keyField = layerFields.find((f) => f.field === field)?.value || '[empty]';
        getGroupKey = (element) => element[keyField];
        headerComponent = GenericGroupHeader;
        elementComponent = GenericGroupElement;
      } else if (type === 'cell_line') {
        getGroupKey = (element) => `${element.cellLineName} - ${element.source}`;
        headerComponent = CellLineGroupHeader;
        elementComponent = CellLineGroupElement;
      }

      const elementGroups = {};
      elements.forEach((element) => {
        const groupKey = getGroupKey(element);
        if (!elementGroups[groupKey]) {
          elementGroups[groupKey] = [];
        }
        elementGroups[groupKey].push(element);
      });

      elementsTableEntries = (
        <ElementsListGroupedEntries
          headerComponent={headerComponent}
          elementComponent={elementComponent}
          elementGroups={elementGroups}
          isElementSelected={this.isElementSelected}
          isGroupCollapsed={this.isGroupCollapsed}
          toggleGroupCollapsed={this.toggleGroupCollapsed}
          showDragColumn={!overview}
          showDetails={this.showDetails}
          initialGroupLimit={type === 'sample' && moleculeSort ? 3 : null}
        />
      );
    } else if (type === 'device_description') {
      elementsTableEntries = (
        <DeviceDescriptionList
          elements={elements}
          isElementSelected={this.isElementSelected}
        />
      );
    } else {
      elementsTableEntries = (
        <ElementsListEntries
          elements={elements}
          isElementSelected={this.isElementSelected}
          showDragColumn={!overview}
          showDetails={this.showDetails}
        />
      );
    }

    return (
      <div ref={this.elementRef} className="elements-list flex-grow-1 h-0 overflow-y-auto pb-3">
        {elementsTableEntries}
        <Sheet className="mt-2 d-flex justify-content-between">
          {this.renderPagination()}
          {this.renderNumberOfResultsInput()}
        </Sheet>
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

ElementsList.defaultProps = {
  genericEl: null,
};

ElementsList.propTypes = {
  overview: PropTypes.bool.isRequired,
  type: PropTypes.string.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  genericEl: PropTypes.object,
};
