# frozen_string_literal: true

# == Schema Information
#
# Table name: reports
#
#  id                   :integer          not null, primary key
#  configs              :text
#  deleted_at           :datetime
#  file_description     :text
#  file_name            :string
#  file_path            :string
#  generated_at         :datetime
#  img_format           :string
#  mol_serials          :text             default([])
#  objects              :text
#  prd_atts             :text             default([])
#  reaction_settings    :text
#  sample_settings      :text
#  si_reaction_settings :text             default({"Name"=>true, "CAS"=>true, "Formula"=>true, "Smiles"=>true, "InCHI"=>true, "Molecular Mass"=>true, "Exact Mass"=>true, "EA"=>true})
#  template             :string           default("standard")
#  created_at           :datetime         not null
#  updated_at           :datetime         not null
#  author_id            :integer
#  report_templates_id  :integer
#
# Indexes
#
#  index_reports_on_author_id            (author_id)
#  index_reports_on_file_name            (file_name)
#  index_reports_on_report_templates_id  (report_templates_id)
#
require 'rails_helper'

RSpec.describe Report, type: :report do
  let(:user) { create(:user) }
  let(:collection) { create(:collection, user: user) }
  let(:reaction1) { create(:reaction, name: 'r1', collections: [collection]) } # rubocop:disable RSpec/IndexedLet
  let(:reaction2) { create(:reaction, name: 'r2', collections: [collection]) } # rubocop:disable RSpec/IndexedLet
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
      filename: "#{rp1.file_name}.#{ext}",
      attachable_id: rp1.id,
      attachable_type: 'Report',
      content_type: docx_mime_type,
      file_path: Rails.root.join('spec/fixtures/upload.jpg'),
    )
  end

  before do
    reaction1
    reaction2
    Delayed::Worker.delay_jobs = false
  end

  after do
    Delayed::Worker.delay_jobs = true
  end

  describe '.create_reaction_docx' do
    it 'returns a Docx string & file name' do
      params = { template: 'single_reaction', id: reaction1.id }
      docx, file_name = described_class.create_reaction_docx(user, [user.id], params)
      expect(docx.class).to eq(String)
      expect(file_name).to include('ELN_Reaction_')
    end
  end

  describe '.create_docx' do # rubocop:disable RSpec/MultipleMemoizedHelpers
    let(:report_template) { create(:report_template) }
    let(:file_name) { 'test_file_name' }
    let(:template) { 'supporting_information' }
    let(:report) { described_class.create(attributes) }
    let(:attributes) do
      {
        file_name: file_name,
        file_description: '',
        configs: {},
        sample_settings: {},
        reaction_settings: {},
        si_reaction_settings: {},
        objects: [{ 'id' => reaction1.id, 'type' => 'reaction' }],
        img_format: 'png',
        template: template,
        author_id: user.id,
      }
    end

    context 'when no db template is requested' do # rubocop:disable RSpec/MultipleMemoizedHelpers
      before do
        user.reports << report
        report.create_docx
      end

      it 'returns a Sablon object' do
        att = report.attachments.first
        expect(att.filename).to include(file_name)
        expect(report.template).to include(template)
      end
    end

    context 'when requested report template is in database' do # rubocop:disable RSpec/MultipleMemoizedHelpers
      before do
        attributes[:report_templates_id] = report_template.id
        user.reports << report
        report.create_docx
      end

      it 'returns a Sablon object' do
        att = report.attachments.first
        expect(att.filename).to include(file_name)
        expect(report.template).to include(template)
      end
    end

    context 'when requested report template is not in database' do # rubocop:disable RSpec/MultipleMemoizedHelpers
      before do
        attributes[:report_templates_id] = -1
        user.reports << report
        report.create_docx
      end

      it 'returns a Sablon object' do
        att = report.attachments.first
        expect(att.filename).to include(file_name)
        expect(report.template).to include(template)
      end
    end
  end

  describe 'delete archive file after Report is destroyed' do
    it 'delete the archive file' do
      att1.attachment_attacher.create_derivatives
      f_path = att1.attachment_url
      t_path = att1.attachment.url
      rp1.really_destroy!
      att1.destroy!
      expect(File.exist?(f_path)).to be false
      expect(File.exist?(t_path)).to be false
    end
  end
end
