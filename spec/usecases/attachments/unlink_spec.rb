# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Usecases::Attachments::Unlink do
  describe '.execute!' do
    subject { described_class.execute!(attachment) }

    let(:attachment) { create(:attachment) }

    it 'returns an attachment' do
      expect(subject).to be_instance_of(Attachment) # rubocop:disable RSpec/NamedSubject
    end

    it 'changes attachable_id' do
      expect(subject.attachable_id).to be_nil # rubocop:disable RSpec/NamedSubject
    end

    it 'set attachable_type to "Container"' do
      expect(subject.attachable_type).to eq('Container') # rubocop:disable RSpec/NamedSubject
    end

    context 'when attachment could not saved' do
      before do
        allow(attachment).to receive(:create_or_update).and_return(false)
      end

      it 'raises an error' do
        expect { subject }.to raise_error(ActiveRecord::RecordNotSaved) # rubocop:disable RSpec/NamedSubject
      end
    end
  end
end
