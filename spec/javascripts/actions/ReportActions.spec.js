import React from 'react'
import expect from 'expect'
import ReportActions from '../../../app/assets/javascripts/components/actions/ReportActions'
Object.assign = require('object-assign')

describe('ReportActions', () => {

  describe('updateSplSettings', () => {
    it('should return the splSetting', () => {
      const payload = {text: "diagram", checked: true}
      const actual = ReportActions.updateSplSettings(payload)
      const expected = payload
      expect(actual).toEqual(expected)
    })
  })

  describe('updateRxnSettings', () => {
    it('should return the rxnSetting', () => {
      const payload = {text: "diagram", checked: true}
      const actual = ReportActions.updateRxnSettings(payload)
      const expected = payload
      expect(actual).toEqual(expected)
    })
  })

  describe('toggleRxnSettingsCheckAll', () => {
    it('should return null', () => {
      const actual = ReportActions.toggleRxnSettingsCheckAll()
      const expected = null
      expect(actual).toEqual(expected)
    })
  })

  describe('toggleSplSettingsCheckAll', () => {
    it('should return null', () => {
      const actual = ReportActions.toggleSplSettingsCheckAll()
      const expected = null
      expect(actual).toEqual(expected)
    })
  })

  describe('updateConfigs', () => {
    it('should return the Config', () => {
      const payload = {text: "Page Break", checked: true}
      const actual = ReportActions.updateConfigs(payload)
      const expected = payload
      expect(actual).toEqual(expected)
    })
  })

  describe('toggleConfigsCheckAll', () => {
    it('should return null', () => {
      const actual = ReportActions.toggleConfigsCheckAll()
      const expected = null
      expect(actual).toEqual(expected)
    })
  })
})
