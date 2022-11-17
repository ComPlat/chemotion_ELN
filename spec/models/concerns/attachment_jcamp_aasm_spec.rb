# frozen_string_literal: true

require 'rails_helper'

class AttachmentAasmTest
  attr_reader :filename
end

RSpec.describe AttachmentJcampAasm do
  filename_empty = ''
  filename_1_part = 'Test_file'
  filename_2_parts = 'Test_file.zip'
  filename_3_parts = 'Test_file.peak.dx'

  describe 'split file name into parts' do
    att_jcamp_aasm = AttachmentAasmTest.new
    att_jcamp_aasm.extend(AttachmentJcampAasm)

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
    att_jcamp_aasm.extend(AttachmentJcampAasm)

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
