require 'rails_helper'

RSpec.describe Report, type: :report do
  let(:user) { create(:user) }
  let(:c1) { create(:collection, label: 'C1', user: user, is_shared: false) }
  let(:r1) { create(:reaction, name: 'r1') }
  let(:r2) { create(:reaction, name: 'r2') }
  let!(:rp1) {
    create(:report, :downloadable, user: user, file_name: 'ELN_Report_1')
  }
  let (:full_file_path) { File.join(Rails.root, 'public', 'docx', 'ELN_Report_1.docx') }
  before(:each) do
    CollectionsReaction.create!(reaction: r1, collection: c1)
    CollectionsReaction.create!(reaction: r2, collection: c1)
    Delayed::Worker.delay_jobs = false
  end

  describe '.create_reaction_docx' do
    it 'returns a Docx string & file name' do
      params = { template: "single_reaction", id: r1.id }
      docx, file_name = Report.create_reaction_docx(user, [user.id], params)
      expect(docx.class).to eq(String)
      expect(file_name).to include("ELN_Reaction_")
    end
  end

  describe '.create_docx' do
    it 'returns a Sablon object' do
      file_name = "test_file_name"
      template = "supporting_information"
      attributes = {
        file_name: file_name,
        file_description: "",
        configs: {},
        sample_settings: {},
        reaction_settings: {},
        objects: [{ "id" => r1.id, "type" => "reaction" }],
        img_format: "png",
        template: template,
        author_id: user.id
      }

      report = Report.create(attributes)
      user.reports << report
      report.create_docx
      expect(report.file_path).to include(file_name)
      expect(report.template).to include(template)
    end
  end

  describe 'delete archive file after Report is destroyed' do
    before do
      FileUtils.touch(full_file_path) unless File.exist?(full_file_path)
      rp1.really_destroy!
    end
    it 'delete the archive file' do
      expect(File.exist?(full_file_path)).to be false
    end
    after(:all) do
      full_file_path = File.join(Rails.root, 'public', 'docx', 'ELN_Report_1.docx')
      `rm  #{full_file_path}` if File.exist?(full_file_path)
      puts "delete tmp reports  "
    end
  end
end
