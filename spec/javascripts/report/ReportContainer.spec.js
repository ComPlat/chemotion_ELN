import React from 'react'
import expect from 'expect'
import { mount, shallow } from 'enzyme'
import sinon from 'sinon'
import {Button, Tab, Panel} from 'react-bootstrap'
import fakeReaction from '../fixture/reaction'
import {originalState} from '../fixture/report'
import ReportContainer from '../../../app/assets/javascripts/components/report/ReportContainer'
import Reports from '../../../app/assets/javascripts/components/report/Reports'

describe('ReportContainer', () => {
  const wrapper = () => {
    return shallow(<ReportContainer />)
  }

  const initState = () => {
    const component = wrapper()
    component.setState(originalState)
    return component
  }

  it('should render GenerateReport/Cancel buttons', () => {
    const component = initState()
    const expectedGenerateBtn = 'Generate Report'
    const expectedCancelBtn = '<i class="fa fa-times">'
    const actual = component.find('Button').map(btn => btn.html()).join(', ')
    expect(actual).toInclude(expectedGenerateBtn).toInclude(expectedCancelBtn)
  })

  it('should render Setting/Config/Report Tabs', () => {
    const component = initState()
    const actualPanel = component.find('Panel').html()
    const actualTab = component.find('Tab').length
    expect(actualPanel).toInclude('Setting').toInclude('Config').toInclude('Report')
    expect(actualTab).toEqual(3)
  })

  it('should render Reports', () => {
    const component = initState()
    const actual = component.find('Reports')
    expect(actual.length).toEqual(1)
  })

  describe('click Cancel', () => {
    it('should execute closeDetails', () => {
      const spy = sinon.spy(ReportContainer.prototype, 'closeDetails')
      const component = initState()
      const target = component.find('Button').last()
      target.simulate('click')
      expect(spy.callCount).toEqual(1)
    })
  })

  describe('click Generate Report', () => {
    it('should execute generateReports', () => {
      const spy = sinon.spy(ReportContainer.prototype, 'generateReports')
      const component = initState()
      const target = component.find('Button').first()
      /* To be updated
      target.simulate('click')
      expect(spy.callCount).toEqual(1)
      */
    })
  })
})
