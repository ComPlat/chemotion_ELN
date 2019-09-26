# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Report, type: :report do
  let(:docx_mime_type) do
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  end
  let(:user) { create(:user) }

  let!(:rp) do
    create(:report, :downloadable, user: user, file_name: 'ELN_Report_1')
  end
  let!(:att_rp) do
    create(
      :attachment,
      filename: rp.file_name + '.docx',
      attachable_id: rp.id,
      attachable_type: 'Report',
      content_type: docx_mime_type
    )
  end
  let!(:ct) do
    create(:container, name: 'test', container_type: 'dataset')
  end
  let!(:att_ct) do
    create(
      :attachment,
      filename: ct.name + '.jpg',
      attachable_id: ct.id,
      attachable_type: 'Container',
      content_type: 'image/jpeg'
    )
  end

  describe '.for_container?' do
    it 'returns true for Container attachments' do
      expect(att_rp.for_container?).to be(false)
      expect(att_ct.for_container?).to be(true)
    end
  end

  describe '.for_report?' do
    it 'returns true for Report attachments' do
      expect(att_rp.for_report?).to be(true)
      expect(att_ct.for_report?).to be(false)
    end
  end

  describe '.container_id' do
    it 'returns an id of a container' do
      expect(att_rp.container_id).to be(nil)
      expect(att_ct.container_id).to be(ct.id)
    end
  end

  describe '.report_id' do
    it 'returns an id of a report' do
      expect(att_rp.report_id).to be(rp.id)
      expect(att_ct.report_id).to be(nil)
    end
  end

  describe '.container' do
    it 'returns a container' do
      expect(att_rp.container).to be(nil)
      expect(att_ct.container.id).to be(ct.id)
    end
  end

  describe '.report' do
    it 'returns a report' do
      expect(att_rp.report.id).to be(rp.id)
      expect(att_ct.report).to be(nil)
    end
  end
end
