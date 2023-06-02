# frozen_string_literal: true

describe ImportSamplesJob do
  context 'when importfile is xlsx' do
    let(:file_path) { Rails.root.join('spec/fixtures/import/sample_import/20230602_import_sample_empty.xlsx') }
    let(:collection_id) { create(:collection).id }
    let(:user_id) { create(:user).id }
    let(:import_job) { described_class.new.perform(file_path, collection_id, user_id) }

    context 'when file is empty' do
      it 'no samples are imported' do
        expect(import_job[:data]).to eq []
      end
    end
  end
end
