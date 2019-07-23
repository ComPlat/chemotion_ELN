import React, { Component } from 'react'
import PropTypes from 'prop-types'
import SVG from 'react-inlinesvg'
import { ControlLabel, Row, Col } from 'react-bootstrap'

import QuillViewer from '../QuillViewer'

import ResearchPlanDetailsAddField from './ResearchPlanDetailsAddField'
import ResearchPlanDetailsDropTarget from './ResearchPlanDetailsDropTarget'
import Field from './ResearchPlanDetailsField'

export default class ResearchPlanDetailsStatic extends Component {

  render() {
    let { name, body } = this.props

    let fields = body.map((field) => {
      let field_html
      switch (field.type) {
        case 'richtext':
          field_html = <QuillViewer value={field.value} />
          break;
        case 'ketcher':
          let svgPath = '/images/research_plans/' + field.value.svg_file

          field_html = (
            <div className="svg-container-static">
              <SVG src={svgPath} className="molecule-mid" />
            </div>
          )
          break;
      }

      return (
        <Row key={field.id}>
          <Col>
            {field_html}
          </Col>
        </Row>
      )
    })

    return (
      <div>
        <h4>{name}</h4>

        {fields}
      </div>
    )
  }
}

ResearchPlanDetailsStatic.propTypes = {
  name: PropTypes.string,
  body: PropTypes.array
}
