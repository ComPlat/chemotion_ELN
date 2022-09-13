# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Usecases::Attachments::Unlink do
  describe '.execute!' do
    let(:attachment) { create(:attachment) }

    subject { described_class.execute!(attachment) }

    it 'returns an attachment' do
      expect(subject).to be_instance_of(Attachment)
    end

    it 'changes attachable_id' do
      expect(subject.attachable_id).to eq(nil)
    end

    it 'changes attachable_id' do
      expect(subject.attachable_type).to eq('Container')
    end

    context 'when attachment could not saved' do
      before do
        allow(attachment).to receive(:create_or_update).and_return(false)
      end

      it 'raises an error' do
        expect { subject }.to raise_error(ActiveRecord::RecordNotSaved)
      end
    end
  end
end
