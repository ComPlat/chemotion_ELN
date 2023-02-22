# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Usecases::Attachments::Delete do
  describe '.execute!' do
    subject { described_class.execute!(attachment) }

    let(:attachment) { create(:attachment, attachable: container) }
    let(:container) { create(:container) }

    it 'returns the attachment' do
      expect(subject).to be_instance_of(Attachment) # rubocop:disable RSpec/NamedSubject
    end

    it 'deletes the attachment on database' do
      attachment.save
      expect { subject }.to change(Attachment, :count).by(-1) # rubocop:disable RSpec/NamedSubject
    end
  end
end
