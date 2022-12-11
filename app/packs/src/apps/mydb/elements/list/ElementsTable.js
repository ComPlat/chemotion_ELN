import React from 'react';

import {
  Pagination, Form, Col, Row, InputGroup, FormGroup, FormControl, Glyphicon, Tooltip, OverlayTrigger
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
import Switch from 'src/apps/mydb/elements/list/Switch';

import UserStore from 'src/stores/alt/stores/UserStore';
import ElementsTableGroupedEntries from 'src/apps/mydb/elements/list/ElementsTableGroupedEntries';
import Select from 'react-select';

export default class ElementsTable extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      elements: [],
      currentElement: null,
      ui: {},
      collapseAll: false,
      moleculeSort: false,
      advancedSearch: false,
      productOnly: false,
      page: null,
      pages: null,
      perPage: null,
      totalElements: null,
      elementsGroup: 'none',
      elementsSort: false,
    };


    this.onChange = this.onChange.bind(this);
    this.onChangeUI = this.onChangeUI.bind(this);

    this.changeDateFilter = this.changeDateFilter.bind(this);

    this.toggleProductOnly = this.toggleProductOnly.bind(this);
    this.setFromDate = this.setFromDate.bind(this);
    this.setToDate = this.setToDate.bind(this);
  }

  componentDidMount() {
    UIStore.getState();
    ElementStore.listen(this.onChange);
    UIStore.listen(this.onChangeUI);
    this.initState();
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onChange);
    UIStore.unlisten(this.onChangeUI);
  }

  onChangeUI(state) {
    if (typeof state[this.props.type] === 'undefined' || state[this.props.type] === null) {
      return;
    }
    const { checkedIds, uncheckedIds, checkedAll } = state[this.props.type];
    const {
      filterCreatedAt, fromDate, toDate, number_of_results, currentSearchSelection, productOnly
    } = state;

    // check if element details of any type are open at the moment
    const currentId = state.sample.currentId || state.reaction.currentId ||
      state.wellplate.currentId;

    let isAdvS = false;
    if (currentSearchSelection && currentSearchSelection.search_by_method) {
      isAdvS = currentSearchSelection.search_by_method === 'advanced';
    }

    const stateChange = (
      checkedIds || uncheckedIds || checkedAll || currentId || filterCreatedAt ||
      fromDate || toDate || productOnly !== this.state.productOnly ||
      isAdvS !== this.state.advancedSearch
    );

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
          toDate
        },
        productOnly,
        advancedSearch: isAdvS
      });
    }
  }

  onChange(state) {
    const type = this.props.type + 's';
    const elementsState = (state && state.elements && state.elements[type]) || {};
    const { elements, page, pages, perPage, totalElements } = elementsState;

    let currentElement;
    if (!state.currentElement || state.currentElement.type == this.props.type) {
      currentElement = state.currentElement
    }

    const elementsDidChange = elements && !deepEqual(elements, this.state.elements);
    const currentElementDidChange = !deepEqual(currentElement, this.state.currentElement);

    const nextState = { page, pages, perPage, totalElements, currentElement }
    if (elementsDidChange) { nextState.elements = elements; }
    if (elementsDidChange || currentElementDidChange) { this.setState(nextState); }
  }

  initState = () => {
    this.onChange(ElementStore.getState());

    const { type, genericEl } = this.props;

    if (type === 'reaction' || genericEl) {
      const userState = UserStore.getState();
      const filters = userState.profile.data.filters || {};

      this.state.elementsGroup = filters[type]?.group || 'none';
      this.state.elementsSort = filters[type]?.sort || false;
    }
  }

  changeCollapse = (collapseAll) => {
    this.setState({ collapseAll: !collapseAll })
  }

  changeSampleSort = () => {
    let { moleculeSort } = this.state;
    moleculeSort = !moleculeSort;

    this.setState({
      moleculeSort
    }, () => ElementActions.changeSorting(moleculeSort))
  }

  changeElementsGroup = (elementsGroup) => {
    const { type } = this.props;
    let { elementsSort } = this.state;

    if (elementsGroup === 'none') {
      elementsSort = false;
    }

    this.setState({
      elementsGroup,
      elementsSort
    }, () => {
      ElementActions.changeElementsFilter({ name: type, sort: elementsSort, group: elementsGroup });
      UserActions.updateUserProfile({ data: { filters: { [type]: { sort: elementsSort, group: elementsGroup } } } });
    });
  }

  changeElementsSort = () => {
    const { type } = this.props;
    let { elementsSort, elementsGroup } = this.state;
    elementsSort = !elementsSort;

    this.setState({
      elementsSort
    }, () => {
      ElementActions.changeElementsFilter({ name: type, sort: elementsSort, group: elementsGroup });
      UserActions.updateUserProfile({ data: { filters: { [type]: { sort: elementsSort, group: elementsGroup } } } });
    });
  }

  handlePaginationSelect(eventKey) {
    const { pages } = this.state;
    const { type } = this.props;

    if (eventKey > 0 && eventKey <= pages) {
      this.setState({
        page: eventKey
      }, () => UIActions.setPagination({ type, page: this.state.page }));
    }
  }

  pagination() {
    if (pages <= 1) {
      return;
    }

    const { page, pages } = this.state;
    let items = [];
    const minPage = Math.max(page - 2, 1);
    const maxPage = Math.min(minPage + 4, pages);
    items.push(<Pagination.First key="First" onClick={() => this.handlePaginationSelect(1)} />);
    if (page > 1) {
      items.push(<Pagination.Prev key="Prev" onClick={() => this.handlePaginationSelect(page - 1)} />);
    }
    for (let _page = minPage; _page <= maxPage; _page = _page + 1) {
      items.push(
        <Pagination.Item
          key={`eltPage${_page}`}
          active={_page === page}
          onClick={() => this.handlePaginationSelect(_page)}>
          {_page}
        </Pagination.Item>
      );
    }

    if (pages > maxPage) {
      items.push(<Pagination.Ellipsis key="Ell" />);
    }
    if (page == pages) {
      items.push(<Pagination.Next key="Next" onClick={() => this.handlePaginationSelect(page + 1)} />);
    }
    items.push(<Pagination.Last key="Last" onClick={() => this.handlePaginationSelect(pages)} />);

    return (
      <div className="list-pagination">
        <Pagination>
          {items}
        </Pagination>
      </div>
    )
  }

  handleNumberOfResultsChange(event) {
    const { value } = event.target;
    const { type } = this.props;

    if (parseInt(value, 10) > 0) {
      UIActions.changeNumberOfResultsShown(value);
      ElementActions.refreshElements(type);
    }
  }

  numberOfResultsInput() {
    const { ui } = this.state
    return (
      <Form horizontal className='list-show-count'>
        <FormGroup>
          <InputGroup>
            <InputGroup.Addon>Show</InputGroup.Addon>
            <FormControl type="text" style={{ textAlign: 'center', zIndex: 0 }}
              onChange={event => this.handleNumberOfResultsChange(event)}
              value={ui.number_of_results ? ui.number_of_results : 0} />
          </InputGroup>
        </FormGroup>
      </Form>
    );
  }

  toggleProductOnly() {
    UIActions.setProductOnly(!this.state.productOnly);
  }

  changeDateFilter() {
    let { filterCreatedAt } = this.state;
    filterCreatedAt = !filterCreatedAt;
    UIActions.setFilterCreatedAt(filterCreatedAt);
  }

  setFromDate(fromDate) {
    if (this.state.fromDate !== fromDate) UIActions.setFromDate(fromDate);
  }

  setToDate(toDate) {
    if (this.state.toDate !== toDate) UIActions.setToDate(toDate);
  }

  collapseButton = () => {
    const { collapseAll } = this.state;
    const collapseIcon = collapseAll ? 'chevron-right' : 'chevron-down';

    return (
      <Glyphicon
        glyph={collapseIcon}
        title="Collapse/Uncollapse"
        onClick={() => this.changeCollapse(collapseAll)}
        style={{
          fontSize: '20px',
          cursor: 'pointer',
          color: '#337ab7',
          top: 0
        }}
      />
    );
  }

  renderSamplesHeader = () => {
    const {
      moleculeSort,
      advancedSearch,
      productOnly,
    } = this.state;

    const options = [
      { value: false, label: 'Grouped by Sample' },
      { value: true, label: 'Grouped by Molecule' }
    ];
    const color = productOnly ? '#5cb85c' : 'currentColor';

    return (
      <>
        <Select
          simpleValue
          options={options}
          clearable={false}
          searchable
          value={moleculeSort}
          onChange={this.changeSampleSort}
          className='header-group-select'
        />
        <button
          style={{ border: 'none' }}
          onClick={this.toggleProductOnly}
        >
          <i
            style={{ cursor: 'pointer', color }}
            className="fa fa-lg fa-product-hunt"
          />
        </button>
        {this.collapseButton()}
      </>
    );
  }

  renderReactionsHeader = () => {
    const { elementsGroup, elementsSort } = this.state;
    const optionsHash = {
      'none': { sortColumn: 'update date', label: 'List' },
      'rinchi_short_key': { sortColumn: 'RInChI', label: 'Grouped by RInChI' },
      'rxno': { sortColumn: 'type', label: 'Grouped by type' },
    }
    const options = Object.entries(optionsHash).map((option) => {
      return { value: option[0], label: option[1].label }
    });
    const sortColumn = optionsHash[elementsGroup].sortColumn;
    const sortTitle = elementsSort ? `sort by ${sortColumn}` : 'sort by update date';
    const sortTooltip = <Tooltip id="reaction_sort_tooltip">{sortTitle}</Tooltip>;
    const sortIconClass = elementsSort ? 'fa-sort-alpha-desc' : 'fa-clock-o';
    const sortIcon = <i className={`fa fa-fw ${sortIconClass}`} />;
    const sortContent = (
      <OverlayTrigger placement="top" overlay={sortTooltip}>
        <button style={{ border: 'none' }} onClick={this.changeElementsSort} >
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
          value={elementsGroup}
          onChange={this.changeElementsGroup}
          className='header-group-select'
        />
        {elementsGroup !== 'none' ? (sortContent) : null}
        {elementsGroup !== 'none' ? (this.collapseButton()) : null}
      </>
    );
  }

  renderGenericElementsHeader = () => {
    const { elementsGroup, elementsSort } = this.state;
    const { genericEl } = this.props;

    let optionsHash = {
      'none': { sortColumn: 'update date', label: 'List' },
    }
    const layers = genericEl.properties_release.layers;
    const allowed_types = [
      "select",
      "text",
      "integer",
      "system-defined",
      "textarea"
    ];

    Object.entries(layers).forEach(layerEntry => {
      layerEntry[1].fields.filter(field => (allowed_types.includes(field.type))).forEach(field => {
        if (Object.keys(optionsHash).length < 11) {
          optionsHash[`${layerEntry[0]}.${field.field}`] = {
            sortColumn: field.label,
            label: field.label
          }
        }
      });
    });
    const options = Object.entries(optionsHash).map((option, index) => {
      const label = index === 0 ? option[1].label : `Grouped by ${option[1].label}`;

      return {
        value: option[0], label: label }
    });

    let sortColumn;
    if (optionsHash[elementsGroup]) {
      sortColumn = optionsHash[elementsGroup].sortColumn;
    } else {
      sortColumn = optionsHash.none.sortColumn;
      this.state.elementsGroup = 'none';
    }
    const sortTitle = elementsSort ? `sort by ${sortColumn}` : 'sort by update date';
    const sortTooltip = <Tooltip id="reaction_sort_tooltip">{sortTitle}</Tooltip>;
    const sortIconClass = elementsSort ? 'fa-sort-alpha-desc' : 'fa-clock-o';
    const sortIcon = <i className={`fa fa-fw ${sortIconClass}`} />;
    const sortContent = (
      <OverlayTrigger placement="top" overlay={sortTooltip}>
        <button style={{ border: 'none' }} onClick={this.changeElementsSort} >
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
          searchable
          value={elementsGroup}
          onChange={this.changeElementsGroup}
          className='header-group-select'
        />
        {elementsGroup !== 'none' ? (sortContent) : null}
        {elementsGroup !== 'none' ? (this.collapseButton()) : null}
      </>
    );
  }

  renderHeader = () => {
    const { filterCreatedAt, ui } = this.state;
    const { type, showReport, genericEl } = this.props;
    const { fromDate, toDate } = ui;

    let typeSpecificHeader = <span />;
    if (type === 'sample') {
      typeSpecificHeader = this.renderSamplesHeader();
    } else if (type === 'reaction') {
      typeSpecificHeader = this.renderReactionsHeader();
    } else if (genericEl) {
      typeSpecificHeader = this.renderGenericElementsHeader();
    }

    const filterTitle = filterCreatedAt === true ? 'filter by creation date' : 'filter by update date';
    const filterIconClass = filterCreatedAt === true ? 'fa-calendar-o' : 'fa-calendar';

    const filterTooltip = <Tooltip id="date_tooltip">{filterTitle}</Tooltip>;
    const filterIcon = <i className={`fa ${filterIconClass}`} />;

    return (
      <div className="table-header" >
        <div className="select-all">
          <ElementAllCheckbox
            type={type}
            ui={ui}
            showReport={showReport}
          />
        </div>
        <div
          className="header-right"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5
          }}
        >
          <OverlayTrigger placement="top" overlay={filterTooltip}>
            <button style={{ border: 'none' }} onClick={this.changeDateFilter} >
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
              dateFormat="DD-MM-YY"
            />
          </div>
          <div className="sample-list-to-date">
            <DatePicker
              selected={toDate}
              placeholderText="To"
              popperPlacement="bottom"
              onChange={this.setToDate}
              isClearable
              dateFormat="DD-MM-YY"
            />
          </div>
          {typeSpecificHeader}
        </div>
      </div>
    );
  }

  renderEntries() {
    const {
      elements,
      ui,
      currentElement,
      collapseAll,
      moleculeSort,
      elementsGroup,
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
          onChangeCollapse={(checked) => this.changeCollapse(!checked)}
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
      <div className="list-elements">
        {elementsTableEntries}
      </div>
    );
  }

  render() {
    return (
      <div className="list-container">
        {this.renderHeader()}
        {this.renderEntries()}
        <div className="list-container-bottom">
          <Row>
            <Col sm={6}>{this.pagination()}</Col>
            <Col sm={6}>{this.numberOfResultsInput()}</Col>
          </Row>
        </div>
      </div>
    );
  }
}
