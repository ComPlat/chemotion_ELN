# frozen_string_literal: true

# rubocop: disable Style/OpenStructUse
require 'rails_helper'

describe Labimotion::Converter do
  describe '#jcamp_converter' do
    let(:response_ng) { OpenStruct.new(ok?: false, success?: false, parsed_response: { error: 'Your file could not be processed.' }) } # rubocop:disable Layout/LineLength
    let(:response_ok) { OpenStruct.new(ok?: true, success?: true, parsed_response: File.read(Rails.root.join('spec/fixtures/upload.zip'))) } # rubocop:disable Layout/LineLength
    let(:attachment) { create(:attachment) }
    let(:converted_attachment) { Attachment.find_by(filename: 'upload.zip') }

    describe 'can not be converted' do
      context 'when not found' do

        before do
          allow(HTTParty)
            .to receive(:post)
            .and_return(response_ng)

          Rails.configuration.converter = OpenStruct.new
          Rails.configuration.converter.url = 'fakeURL'
        end

        it 'attachment of converted file was not created' do
          expect(described_class.jcamp_converter(attachment.id)).to eq 9
        end
      end
    end

    describe 'file converted' do
      context 'when attachment found' do

        before do
          allow(HTTParty)
            .to receive(:post)
            .and_return(response_ok)

          Rails.configuration.converter = OpenStruct.new
          Rails.configuration.converter.url = 'fakeURL'
        end

        it 'attachment of converted file was created' do
          described_class.jcamp_converter(attachment.id)
          expect(converted_attachment).not_to be_nil
        end
      end
    end
  end
end

# rubocop: enable Style/OpenStructUse
