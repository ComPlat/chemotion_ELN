# frozen_string_literal: true

# rubocop: disable Style/OpenStructUse
require 'rails_helper'

describe Analyses::Converter do
  describe '#jcamp_converter' do
    let(:response) { OpenStruct.new(ok?: true, parsed_response: 'a fake response body') }
    let(:attachment) { create(:attachment) }
    let(:converted_attachment) { Attachment.find_by(filename: 'upload.jdx') }

    before do
      allow(HTTParty)
        .to receive(:post)
        .and_return(response)

      Rails.configuration.converter = OpenStruct.new
      Rails.configuration.converter.url = 'fakeURL'

      described_class.jcamp_converter(attachment.id)
    end

    context 'when attachment is present' do
      it 'attachment of converted file was created' do
        expect(converted_attachment).not_to be_nil
      end
    end
  end
end

# rubocop: enable Style/OpenStructUse
