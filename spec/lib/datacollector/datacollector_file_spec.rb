# frozen_string_literal: true

require 'rails_helper'

RSpec.describe DatacollectorFile, type: :model do
  let(:user) { create(:person, name_abbreviation: 'CU1') }
  let(:device) { create(:device, users: [user]) }

  describe '.collect_from' do
    context 'when have valid file' do
      let(:datacollector) { described_class.new("#{Rails.root}/spec/fixtures/CU1-folder/CU1-abc.txt", nil).collect_from(device) }

      it 'returns attachment' do
        expect(datacollector).to be_instance_of(Attachment)
        expected = Attachment.find_by(filename: 'CU1-abc.txt')
        expect(datacollector['filename']).to eq(expected['filename'])
      end
    end
  end
end