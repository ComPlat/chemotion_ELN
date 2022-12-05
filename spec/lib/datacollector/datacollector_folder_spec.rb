# frozen_string_literal: true

require 'rails_helper'

RSpec.describe DatacollectorFolder, type: :model do
  let(:user) { create(:person, name_abbreviation: 'CU1') }
  let(:device) { create(:device, users: [user]) }
  let(:attachment) { Attachment.find_by(filename: 'CU1-folder.zip') }

  describe '.collect_from' do
    context 'when have valid file' do
      before do
        datacollector = described_class.new(Rails.root.join('spec/fixtures/CU1-folder').to_s, nil)
        datacollector.files = [File.join('CU1-abc.txt')]
        datacollector.collect(device)
      end

      it 'attachment was saved' do
        expect(attachment).not_to be_nil
      end

      it 'file was correctly attached' do
        expect(attachment.attachment_data).not_to be_nil
      end
    end
  end
end
