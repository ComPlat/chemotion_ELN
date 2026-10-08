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
# rubocop:disable Layout/LineLength
#  si_reaction_settings :text             default({"Name"=>true, "CAS"=>true, "Formula"=>true, "Smiles"=>true, "InCHI"=>true, "Molecular Mass"=>true, "Exact Mass"=>true, "EA"=>true})
# rubocop:enable Layout/LineLength
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

    # Guards against the "Word found unreadable content" warning: every
    # relationship referenced by the document must be declared and its target
    # part present, every part extension must have a content type, no merge
    # field control text may remain, and VML shape ids must be unique.
    context 'with the generated OOXML package' do
      let(:entries) do
        require 'zip'
        params = { template: 'single_reaction', id: reaction1.id }
        docx, = described_class.create_reaction_docx(user, [user.id], params)

        {}.tap do |parts|
          Zip::File.open_buffer(StringIO.new(docx)) do |zip|
            zip.each { |e| parts[e.name] = e.get_input_stream.read if e.file? }
          end
        end
      end

      # every r:id / r:embed referenced in the document resolves to a declared
      # relationship whose target part exists in the package
      it 'resolves every referenced relationship to an existing part' do
        rels = entries['word/_rels/document.xml.rels']
        ref_rids = entries['word/document.xml'].scan(/r:(?:id|embed)="(rId\d+)"/).flatten.uniq
        ref_rids.each do |rid|
          target = rels[/Id="#{rid}"[^>]*Target="([^"]+)"/, 1] ||
                   rels[/Target="([^"]+)"[^>]*Id="#{rid}"/, 1]
          expect(target).to be_present, "rId #{rid} is not declared in document.xml.rels"
          next if target.start_with?('http', '../') # external/customXml targets

          expect(entries).to have_key("word/#{target}"), "missing part word/#{target}"
        end
      end

      it 'declares a content type for every media and embeddings part extension' do
        content_types = entries['[Content_Types].xml'].downcase
        entries.keys.grep(%r{word/(media|embeddings)/}).each do |part|
          ext = File.extname(part).delete('.').downcase
          expect(content_types).to include(%(extension="#{ext}")), "content type for .#{ext} not declared"
        end
      end

      it 'leaves no merge-field control text' do
        expect(entries['word/document.xml']).not_to include('MERGEFIELD')
      end

      it 'uses unique VML shape ids' do
        shape_ids = entries['word/document.xml'].scan(/<v:shape[^>]*\bid="([^"]+)"/).flatten
        expect(shape_ids).to eq(shape_ids.uniq), "duplicate v:shape ids: #{shape_ids.inspect}"
      end
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

  describe 'serialized attributes' do
    it 'round-trips hashes and arrays' do
      rp1.update!(configs: { 'a' => 1 }, objects: [{ 'id' => 1, 'type' => 'sample' }])

      expect(rp1.reload.configs).to eq('a' => 1)
      expect(rp1.objects).to eq [{ 'id' => 1, 'type' => 'sample' }]
    end
  end

  describe '#queue_name' do
    it 'is derived from the report id' do
      expect(rp1.queue_name).to eq "report_#{rp1.id}"
    end
  end

  describe '#create_docx' do
    let(:worker) { instance_double(Reporter::Worker, process: nil) }
    let(:report) { create(:report, user: user) }

    it 'is delayed' do
      Delayed::Worker.delay_jobs = true

      expect { report.create_docx }.to change(Delayed::Job, :count).by(1)
    end

    context 'without report template' do
      before { allow(Reporter::Worker).to receive(:new).and_return(worker) }

      it 'processes the report with the standard worker and template' do
        report.create_docx_without_delay

        expect(Reporter::Worker).to have_received(:new).with(
          report: report, template_path: Rails.root.join('lib/template/Standard.docx'),
        )
        expect(worker).to have_received(:process)
      end
    end

    context 'with a spectrum report template' do
      before do
        allow(Reporter::WorkerSpectrum).to receive(:new).and_return(worker)
        report.update!(report_templates_id: create(:report_template, report_type: 'spectrum').id)
      end

      it 'processes the report with the spectrum worker' do
        report.create_docx_without_delay

        expect(Reporter::WorkerSpectrum).to have_received(:new).with(
          report: report, template_path: Rails.root.join('lib/template/Spectra.docx'),
        )
      end
    end

    context 'with a supporting information report template' do
      before { allow(Reporter::WorkerSi).to receive(:new).and_return(worker) }

      it 'processes non standard reactions for supporting_information' do
        report.update!(report_templates_id: create(:report_template, report_type: 'supporting_information').id)
        report.create_docx_without_delay

        expect(Reporter::WorkerSi).to have_received(:new).with(hash_including(std_rxn: false))
      end

      it 'processes standard reactions for supporting_information_std_rxn' do
        report.update!(report_templates_id: create(:report_template, report_type: 'supporting_information_std_rxn').id)
        report.create_docx_without_delay

        expect(Reporter::WorkerSi).to have_received(:new).with(hash_including(std_rxn: true))
      end
    end

    context 'with a reaction list report template' do
      before { allow(Reporter::WorkerRxnList).to receive(:new).and_return(worker) }

      %w[xlsx csv].each do |ext|
        it "exports the reaction list as #{ext}" do
          report.update!(report_templates_id: create(:report_template, report_type: "rxn_list_#{ext}").id)
          report.create_docx_without_delay

          expect(Reporter::WorkerRxnList).to have_received(:new).with(report: report, ext: ext)
        end
      end

      it 'exports the reaction list as html with the erb template' do
        report.update!(report_templates_id: create(:report_template, report_type: 'rxn_list_html').id)
        report.create_docx_without_delay

        expect(Reporter::WorkerRxnList).to have_received(:new).with(
          report: report, template_path: Rails.root.join('lib/template/rxn_list.html.erb'), ext: 'html',
        )
      end
    end
  end

  describe '.docx_file_name' do
    before { travel_to Time.zone.local(2024, 5, 6, 7, 8, 9) }

    it 'names supporting information reports' do
      expect(described_class.docx_file_name('supporting_information'))
        .to eq 'Supporting_Information_2024-05-06T07-08-09.docx'
    end

    it 'names standard reaction supporting information reports' do
      expect(described_class.docx_file_name('supporting_information_std_rxn'))
        .to eq 'Supporting_Information_Standard_Reaction_2024-05-06T07-08-09.docx'
    end

    it 'names single reaction reports' do
      expect(described_class.docx_file_name('single_reaction')).to eq 'ELN_Reaction_2024-05-06T07-08-09.docx'
    end

    it 'falls back to a generic report name' do
      expect(described_class.docx_file_name('anything')).to eq 'ELN_Report_2024-05-06T07-08-09.docx'
    end
  end

  describe '.template_path' do
    {
      'supporting_information' => 'Supporting_information.docx',
      'supporting_information_std_rxn' => 'Supporting_information.docx',
      'spectrum' => 'Spectra.docx',
      'single_reaction' => 'Standard.docx',
      'rxn_list_html' => 'rxn_list.html.erb',
      'unknown' => 'Standard.docx',
    }.each do |template, file|
      it "returns #{file} for #{template}" do
        path = described_class.template_path(template)

        expect(path).to eq Rails.root.join('lib', 'template', file)
        expect(path).to exist
      end
    end
  end

  describe '.merge' do
    before { travel_to Time.zone.local(2024, 5, 6) }

    it 'combines the author, date, settings and contents' do
      merged = described_class.merge(user, [:content], { spl: true }, { rxn: true }, { conf: true })

      expect(merged).to eq(
        date: '06.05.2024', author: "#{user.first_name} #{user.last_name}",
        spl_settings: { spl: true }, rxn_settings: { rxn: true }, configs: { conf: true }, objs: [:content]
      )
    end
  end

  describe 'default settings' do
    it 'enables every sample setting' do
      expect(described_class.all_spl_settings.values).to all(be(true))
      expect(described_class.all_spl_settings.keys).to contain_exactly(
        :diagram, :collection, :analyses, :reaction_description
      )
    end

    it 'enables every reaction setting' do
      expect(described_class.all_rxn_settings.values).to all(be(true))
      expect(described_class.all_rxn_settings).to include(:dangerous_products, :variations)
    end

    it 'enables page breaks and whole diagrams' do
      expect(described_class.all_configs).to eq(page_break: true, whole_diagram: true)
    end
  end

  describe 'after_destroy :delete_archive' do
    let(:archive) { File.join('public', 'docx', "#{rp1.file_name}.docx") }

    before do
      allow(File).to receive(:exist?).and_call_original
      allow(FileUtils).to receive(:rm)
    end

    it 'removes an existing docx archive' do
      allow(File).to receive(:exist?).with(archive).and_return(true)
      rp1.destroy

      expect(FileUtils).to have_received(:rm).with(archive, force: true)
    end

    it 'does nothing without archive' do
      allow(File).to receive(:exist?).with(archive).and_return(false)
      rp1.destroy

      expect(FileUtils).not_to have_received(:rm)
    end
  end

  describe 'after_destroy :delete_job' do
    it 'deletes the queued report job' do
      job = Delayed::Job.create!(handler: '--- {}', queue: rp1.queue_name)
      other = Delayed::Job.create!(handler: '--- {}', queue: 'other')
      rp1.destroy

      expect(Delayed::Job.find_by(id: job.id)).to be_nil
      expect(Delayed::Job.find_by(id: other.id)).to be_present
    end
  end

  describe '#destroy' do
    it 'soft-deletes the report' do
      rp1.destroy

      expect(described_class.with_deleted.find(rp1.id).deleted_at).to be_present
    end
  end
end
