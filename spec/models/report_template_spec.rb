require 'rails_helper'

RSpec.describe ReportTemplate, type: :model do
  describe 'creation' do
    let!(:report_template) { create(:report_template) }

    it 'is possible to create a valid report template' do
      expect(report_template.valid?).to be(true)
    end

    it 'is valid if attachment_id is null' do
      report_template.attachment_id = nil
      expect(report_template.valid?).to be(true)
    end

    it 'is invalid if name is null' do
      report_template.name = nil
      expect(report_template.valid?).to be(false)
    end

    it 'is invalid if report_type is null' do
      report_template.report_type = nil
      expect(report_template.valid?).to be(false)
    end
  end
end
