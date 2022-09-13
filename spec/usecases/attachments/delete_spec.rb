# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Usecases::Attachments::Delete do
  describe '.execute!' do
    let(:attachment) { create(:attachment, attachable: container) }
    let(:container) { create(:container) }

    subject { described_class.execute!(attachment) }

    it 'returns the attachment' do
      expect(subject).to be_instance_of(Attachment)
    end

    it 'deletes the attachment on database' do
      attachment.save
      expect { subject }.to change(Attachment, :count).by(-1)
    end
  end
end
