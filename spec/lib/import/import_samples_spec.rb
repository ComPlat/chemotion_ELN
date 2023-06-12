# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Import::ImportSamples' do
  let(:user_id) { create(:user).id }
  let(:collection_id) { create(:collection).id }
  let(:file_path) { 'spec/fixtures/import/sample_import_template.xlsx' }
  let(:file_name) { File.basename(file_path) }
  let(:importer) { Import::ImportSamples.new(user_id, collection_id, file_path, file_name) }

  describe '.format_to_interval_syntax' do
    let(:processed_row) { importer.send(:format_to_interval_syntax, unprocessed_row) }

    context 'with single integer number' do
      let(:unprocessed_row) { '1' }

      it 'returns single number' do
        # expect(formated_value).to eq ['13.0']
        expect(processed_row).to eq '[1.0, Infinity]'
      end
    end

    context 'with single float number' do
      let(:unprocessed_row) { '1.234' }

      it 'returns single number' do
        # expect(formated_value).to eq ['13.0']
        expect(processed_row).to eq '[1.234, Infinity]'
      end
    end

    context 'with range float/float number' do
      let(:unprocessed_row) { '1.234-2.345' }

      it 'returns interval' do
        # expect(formated_value).to eq ['13.0']
        expect(processed_row).to eq '[1.234, 2.345]'
      end
    end

    context 'with range float/int number' do
      let(:unprocessed_row) { '1.234-1' }

      it 'returns interval' do
        # expect(formated_value).to eq ['13.0']
        expect(processed_row).to eq '[1.234, 1.0]'
      end
    end

    context 'with invalide format' do
      let(:unprocessed_row) { '1.23.4-1' }

      it 'returns infinity interval' do
        # expect(formated_value).to eq ['13.0']
        expect(processed_row).to eq '[-Infinity, Infinity]'
      end
    end

    context 'with range float/negative int number' do
      let(:unprocessed_row) { '1.234--1' }

      it 'returns interval' do
        # expect(formated_value).to eq ['13.0']
        expect(processed_row).to eq '[1.234, -1.0]'
      end
    end
  end
end
