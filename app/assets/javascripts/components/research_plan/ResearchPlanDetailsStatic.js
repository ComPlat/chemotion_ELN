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
      let html
      switch (field.type) {
        case 'richtext':
          html = <QuillViewer value={field.value} />
          break;
        case 'ketcher':
          let svgPath = '/images/research_plans/' + field.value.svg_file

          html = (
            <div className="svg-container-static">
              <SVG src={svgPath} className="molecule-mid" />
            </div>
          )
          break;

        case 'image':
          let src = '/images/research_plans/' + field.value.public_name
          html = (
            <div className="image-container">
              <img src={src} alt={field.value.file_name} />
            </div>
          )
      }

      return (
        <Row key={field.id}>
          <Col md={12}>
            {html}
          </Col>
        </Row>
      )
    })

    return (
      <div>
        <h4>{name}</h4>

        <div className="research-plan-details-static">
          {fields}
        </div>
      </div>
    )
  }
}

ResearchPlanDetailsStatic.propTypes = {
  name: PropTypes.string,
  body: PropTypes.array
}
