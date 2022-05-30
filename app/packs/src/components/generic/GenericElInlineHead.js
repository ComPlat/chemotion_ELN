import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { sortBy } from 'lodash';

import UserStore from '../stores/UserStore';
import { BaseFieldTypes } from '../elements/ElementField'

export default class GenericElInlineHead extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    const { type } = this.props

    const genericEls = (UserStore.getState() && UserStore.getState().genericEls) || []
    const genericEl = genericEls.find(el => el.name == type)

    const fields = []
    const sortedLayers = sortBy(genericEl.properties_release.layers, l => l.position) || []
    sortedLayers.forEach(layer => {
      const sortedFields = sortBy(layer.fields, f => f.position) || []
      sortedFields.forEach(field => {
        fields.push(field)
      })
    })

    return (
      <React.Fragment>
        <th style={{ width: 150 }}>{genericEl.label}</th>
        {
          fields.map((field, index) => {
            if (BaseFieldTypes.map(type => type.value).includes(field.type)) {
              return <th key={index} style={{ width: 150 }}>{field.label}</th>
            }
          })
        }
      </React.Fragment>
    )
  }
}

GenericElInlineHead.propTypes = {
  type: PropTypes.string
};
