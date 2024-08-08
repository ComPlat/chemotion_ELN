# frozen_string_literal: true

require 'rails_helper'

class AttachmentAasmTest
  attr_reader :filename, :attachable_id
end

RSpec.describe AttachmentJcampAasm do # rubocop:disable RSpec/MultipleDescribes
  filename_empty = ''
  filename_1_part = 'Test_file'
  filename_2_parts = 'Test_file.zip'
  filename_3_parts = 'Test_file.peak.dx'

  describe 'split file name into parts' do
    att_jcamp_aasm = AttachmentAasmTest.new
    att_jcamp_aasm.extend(described_class)

    context 'when file name is empty' do
      before do
        att_jcamp_aasm.instance_variable_set(:@filename, filename_empty)
      end

      it 'split file name into 0 parts' do
        file_name_parts = att_jcamp_aasm.filename_parts
        expect(file_name_parts.count).to eq(0)
      end
    end

    context 'when file name has 1 part' do
      before do
        att_jcamp_aasm.instance_variable_set(:@filename, filename_1_part)
      end

      it 'split file name into 1 parts' do
        file_name_parts = att_jcamp_aasm.filename_parts
        expect(file_name_parts.count).to eq(1)
      end
    end

    context 'when file name has 2 parts' do
      before do
        att_jcamp_aasm.instance_variable_set(:@filename, filename_2_parts)
      end

      it 'split file name into 2 parts' do
        file_name_parts = att_jcamp_aasm.filename_parts
        expect(file_name_parts.count).to eq(2)
      end
    end

    context 'when file name has 3 parts' do
      before do
        att_jcamp_aasm.instance_variable_set(:@filename, filename_3_parts)
      end

      it 'split file name into 3 parts' do
        file_name_parts = att_jcamp_aasm.filename_parts
        expect(file_name_parts.count).to eq(3)
      end
    end
  end

  describe 'get file extension' do
    att_jcamp_aasm = AttachmentAasmTest.new
    att_jcamp_aasm.extend(described_class)

    context 'when file name is empty' do
      before do
        att_jcamp_aasm.instance_variable_set(:@filename, filename_empty)
      end

      it 'can parse extension parts' do
        extension_parts = att_jcamp_aasm.extension_parts
        expect(extension_parts.count).to eq(2)
      end

      it 'extension parts are nil' do
        extension_parts = att_jcamp_aasm.extension_parts
        expect(extension_parts[0]).to be_nil
        expect(extension_parts[1]).to be_nil
      end
    end

    context 'when file name has 1 part' do
      before do
        att_jcamp_aasm.instance_variable_set(:@filename, filename_1_part)
      end

      it 'can parse extension parts' do
        extension_parts = att_jcamp_aasm.extension_parts
        expect(extension_parts.count).to eq(2)
      end

      it 'extension parts' do
        extension_parts = att_jcamp_aasm.extension_parts
        expect(extension_parts[0]).to be_nil
        expect(extension_parts[1]).to eq(filename_1_part)
      end
    end

    context 'when file name has 2 parts' do
      before do
        att_jcamp_aasm.instance_variable_set(:@filename, filename_2_parts)
      end

      it 'can parse extension parts' do
        extension_parts = att_jcamp_aasm.extension_parts
        expect(extension_parts.count).to eq(2)
      end

      it 'extension parts' do
        extension_parts = att_jcamp_aasm.extension_parts
        expect(extension_parts[1]).to eq('zip')
      end
    end

    context 'when file name has 3 parts' do
      before do
        att_jcamp_aasm.instance_variable_set(:@filename, filename_3_parts)
      end

      it 'can parse extension parts' do
        extension_parts = att_jcamp_aasm.extension_parts
        expect(extension_parts.count).to eq(2)
      end

      it 'extension parts' do
        extension_parts = att_jcamp_aasm.extension_parts
        expect(extension_parts[0]).to eq('peak')
        expect(extension_parts[1]).to eq('dx')
      end
    end
  end
end

describe 'AttachmentJcampProcess' do
  describe '#get_infer_json_content' do
    let(:attachment_txt1) { create(:attachment) }

    let(:att_jcamp_aasm) do
      att_jcamp_aasm = AttachmentAasmTest.new
      att_jcamp_aasm.extend(AttachmentJcampProcess)
      att_jcamp_aasm.instance_variable_set(:@attachable_id, container_id)
      att_jcamp_aasm
    end

    let(:execute) { att_jcamp_aasm.get_infer_json_content }

    context 'with one attachment which is a txt file' do
      let(:container_id) { attachment_txt1.attachable_id }

      it 'an emtpy json returned' do
        expect(execute).to eq '{}'
      end
    end

    context 'with two attachment which area all a txt files' do
      let(:container_id) { attachment_txt1.attachable_id }
      let!(:attachment_txt2) do
        attachment2 = create(:attachment)
        attachment2.attachable_id = attachment_txt1.attachable_id
        attachment2.save!
      end

      it 'an emtpy json returned' do
        expect(execute).to eq '{}'
      end
    end

    context 'with two attachment which area all a txt files' do
      let(:container_id) { -1 }

      it 'an emtpy json returned' do
        expect(execute).to eq '{}'
      end
    end

    context 'with one attachment which has infer in name and is json' do
      let(:container_id) { json_attachment.attachable_id }
      let(:json_attachment) { create(:attachment, :with_infer_json_file) }

      before do
        allow_any_instance_of(Attachment).to receive(:json?).and_return(true)
      end

      it 'returns the first file contained in the container' do
        expect(execute).to eq json_attachment.read_file
      end
    end
  end
end
