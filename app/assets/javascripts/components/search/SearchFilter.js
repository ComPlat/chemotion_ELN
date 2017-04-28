import React from 'react'
import {Button, FormControl} from 'react-bootstrap'
import Select from 'react-select'
import UIActions from '../actions/UIActions';
import XSearchParams from "../extra/AdvancedSearchXSearchParams";

export default class SearchFilter extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      showFilters: props.show,
      filters: [
        { link: "", match: "EXACT", field: "", value: "" }
      ]
    }

    this.listOptions = [
      {
        value: {
          table: 'sample',
          column: 'name',
          label: 'Sample Name'
        },
        label: 'Sample Name'
      },
      {
        value: {
          table: 'sample',
          column: 'short_label',
          label: 'Sample Short Label'
        },
        label: 'Sample Short Label'
      },
      {
        value: {
          table: 'sample',
          column: 'external_label',
          label: 'Sample External Label'
        },
        label: 'Sample External Label'
      }
    ]

    for (let i = 0; i < XSearchParams.count; i++){
      if (XSearchParams[`on${i}`]){
        this.listOptions = this.listOptions.concat(XSearchParams[`content${i}`])
      }
    }

    this.andOrOps = [
      { value: "AND", label: "AND" },
      { value: "OR", label: "OR" }
    ]

    this.matchOps = [
      { value: "EXACT", label: "EXACT" },
      { value: "LIKE", label: "SUBSTRING" }
    ]

    this.search = this.search.bind(this)
    this.showFilters = this.showFilters.bind(this)
    this.renderField = this.renderField.bind(this)
    this.handleUpdateFilters = this.handleUpdateFilters.bind(this)
  }

  componentWillReceiveProps(nextProps) {
    this.setState({showFilters: nextProps.show})
  }

  showFilters(bool) {
    let show = !this.state.showFilters
    if (typeof(bool) == "boolean") {
      show = bool
      UIActions.toggleAdvancedSearch(bool)
    }

    this.setState({ showFilters: show })
  }

  handleUpdateFilters(idx, field, val) {
    let {filters} = this.state

    filters[idx][field] = val

    let filter = filters[filters.length - 1]
    let check = (filter.field && filter.value && filter.link) ||
                (idx == 0 && filter.field && filter.value)

    if (check) filters.push({link: "OR", match: "EXACT", field: "", value: ""})

    this.setState(filters)
  }

  search() {
    let {filters} = this.state

    // Remove illegal filter
    filters = filters.filter((f, id) => {
      return (f.field && f.link && f.value) ||
        (id == 0 && f.field && f.value)
    })

    this.setState({
      showFilters: false,
      filters: filters
    }, this.props.searchFunc(filters))
  }

  renderField(val) {
    return (val.label)
  }

  renderOptions() {
    let {filters} = this.state

    let defaultRow = (
      <div style={{display: "flex"}}>
        <span style={{flex: "0 0 127px"}} />
        <span className="match-select">
          <Select simpleValue searchable={false} options={this.matchOps}
            placeholder="Select search type" clearable={false}
            value={filters[0].match}
            onChange={(val) => this.handleUpdateFilters(0, "match", val)} />
        </span>
        <span className="field-select">
          <Select simpleValue searchable={false} options={this.listOptions}
            placeholder="Select search field" clearable={false}
            value={filters[0].field} valueRenderer={this.renderField}
            onChange={(val) => this.handleUpdateFilters(0, "field", val)} />
        </span>
        <FormControl type="text" value={filters[0].value}
          componentClass="textarea"
          className="value-select" placeholder="Search value"
          onChange={(e) => this.handleUpdateFilters(0, "value", e.target.value)}
        />
      </div>
    )

    let dynamicRow = ( <span /> )

    if (filters.length > 1) {
      let addedFilters = filters.filter((val, idx) => idx > 0)

      dynamicRow = addedFilters.map((filter, idx) => {
        let id = idx + 1
        return (
          <div key={"filter_" + idx} style={{display: "flex"}}>
            <span className="link-select">
              <Select simpleValue options={this.andOrOps}
                value={filter.link} clearable={false}
                onChange={(val) => this.handleUpdateFilters(id, "link", val)} />
            </span>
            <span className="match-select">
              <Select simpleValue options={this.matchOps}
                value={filter.match} clearable={false}
                onChange={(val) => this.handleUpdateFilters(id, "match", val)} />
            </span>
            <span className="field-select">
              <Select simpleValue options={this.listOptions} clearable={false}
                placeholder="Select search field" value={filter.field}
                onChange={(val) => this.handleUpdateFilters(id, "field", val)} />
            </span>
            <FormControl type="text" value={filters.value}
              componentClass="textarea" rows={2}
              className="value-select" placeholder="Search value"
              onChange={(e) => this.handleUpdateFilters(id, "value", e.target.value)}
            />
          </div>
        )
      })

    }

    return (
      <div>
        {defaultRow}
        {dynamicRow}
      </div>
    )
  }

  render() {
    let {showFilters, currentOption} = this.state
    if (!showFilters) return (<span />)

    return (
      <div className="advanced-search">
        {this.renderOptions()}
        <div className="footer">
          <Button bsStyle="primary" onClick={this.search}>
            Search
          </Button>
          <Button bsStyle="warning" onClick={() => this.showFilters(false)}>
            Close
          </Button>
        </div>
      </div>
    )
  }
}
