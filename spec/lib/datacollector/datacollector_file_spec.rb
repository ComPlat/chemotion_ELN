# frozen_string_literal: true

require 'rails_helper'

RSpec.describe DatacollectorFile, type: :model do
  let(:user) { create(:person, name_abbreviation: 'CU1') }
  let(:device) { create(:device, users: [user]) }
  let(:expected_attachment) { Attachment.find_by(filename: 'CU1-abc.txt') }

  describe '.collect_from' do
    context 'when have valid file' do
      before do
        described_class.new(Rails.root.join('spec/fixtures/CU1-folder/CU1-abc.txt').to_s, nil).collect_from(device)
      end

      it 'attachment is saved' do
        expect(expected_attachment).not_to be_nil
      end

      it 'filedata was attached' do
        expect(expected_attachment.attachment_data).not_to be_nil
      end
    end
  end
end
