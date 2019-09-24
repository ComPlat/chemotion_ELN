# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Report, type: :report do
  let(:user) { create(:user) }
  let(:c1) { create(:collection, label: 'C1', user: user, is_shared: false) }
  let(:r1) { create(:reaction, name: 'r1') }
  let(:r2) { create(:reaction, name: 'r2') }
  let!(:rp1) do
    create(:report, :downloadable, user: user, file_name: 'ELN_Report_1')
  end
  let(:docx_mime_type) do
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  end
  let(:ext) { 'docx' }
  let!(:att1) do
    create(
      :attachment,
      filename: rp1.file_name + '.' + ext,
      attachable_id: rp1.id,
      attachable_type: 'Report',
      content_type: docx_mime_type
    )
  end

  before do
    CollectionsReaction.create!(reaction: r1, collection: c1)
    CollectionsReaction.create!(reaction: r2, collection: c1)
    Delayed::Worker.delay_jobs = false
  end

  describe '.create_reaction_docx' do
    it 'returns a Docx string & file name' do
      params = { template: 'single_reaction', id: r1.id }
      docx, file_name = described_class.create_reaction_docx(user, [user.id], params)
      expect(docx.class).to eq(String)
      expect(file_name).to include('ELN_Reaction_')
    end
  end

  describe '.create_docx' do
    it 'returns a Sablon object' do
      file_name = 'test_file_name'
      template = 'supporting_information'
      attributes = {
        file_name: file_name,
        file_description: '',
        configs: {},
        sample_settings: {},
        reaction_settings: {},
        si_reaction_settings: {},
        objects: [{ 'id' => r1.id, 'type' => 'reaction' }],
        img_format: 'png',
        template: template,
        author_id: user.id
      }

      report = described_class.create(attributes)
      user.reports << report
      report.create_docx
      att = report.attachments.first
      expect(att.filename).to include(file_name)
      expect(report.template).to include(template)
    end
  end

  describe 'delete archive file after Report is destroyed' do
    let(:f_path) { att1.store.path }
    let(:t_path) { att1.store.thumb_path }

    before do
      rp1.really_destroy!
      att1.destroy!
    end

    it 'delete the archive file' do
      expect(File.exist?(f_path)).to be false
      expect(File.exist?(t_path)).to be false
    end
  end
end
