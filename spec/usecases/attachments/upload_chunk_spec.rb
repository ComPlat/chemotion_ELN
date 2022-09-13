# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Usecases::Attachments::UploadChunk do
  describe '.execute!' do
    subject { described_class.execute!(params) }

    let(:params) do
      {
        file: {
          tempfile: Rails.root.join('spec', 'fixtures', 'upload.txt')
        },
        key: '453cc77f-e0e6-4757-b47b-656137eb7084',
        counter: 1
      }
    end
    let(:expected_tmp_path) do
      Rails.root.join('tmp', 'uploads', 'chunks')
    end
    let(:expected_file) do
      Rails.root.join('tmp', 'uploads', 'chunks', "#{params[:key]}$#{params[:counter]}")
    end

    after { FileUtils.rm_rf(expected_tmp_path) }

    it 'returns always true' do
      expect(subject).to eq(true)
    end

    it 'creates a temp directory' do
      subject
      expect(File).to exist(expected_tmp_path)
    end

    it 'stores the file' do
      subject
      expect(File).to exist(expected_file)
    end
  end
end
