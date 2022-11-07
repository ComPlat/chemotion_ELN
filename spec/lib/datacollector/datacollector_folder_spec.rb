# frozen_string_literal: true

require 'rails_helper'

RSpec.describe DatacollectorFolder, type: :model do
  let(:user) { create(:person, name_abbreviation: 'CU1') }
  let(:device) { create(:device, users: [user]) }

  describe '.collect_from' do
    context 'when have valid file' do
      let(:result) do
        datacollector = described_class.new("#{Rails.root}/spec/fixtures/CU1-folder", nil)
        datacollector.files = [File.join('CU1-abc.txt')]
        datacollector.collect(device)
      end
      # let(:datacollector) { described_class.new("#{Rails.root}/spec/fixtures/CU1-folder", nil) }
      # datacollector.files = [File.join('CU1-abc.txt')]
      # result = datacollector.collect(device)

      it 'returns true and have attachment name CU1-folder.zip' do
        expect(result).to eq true

        attachment = Attachment.find_by(filename: 'CU1-folder.zip')
        expect(attachment).not_to be_nil
      end
    end
  end
end