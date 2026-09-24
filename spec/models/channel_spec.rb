# frozen_string_literal: true

# == Schema Information
#
# Table name: channels
#
#  id           :integer          not null, primary key
#  subject      :string
#  msg_template :jsonb
#  channel_type :integer          default(0)
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#
require 'rails_helper'

RSpec.describe Channel do
  describe 'associations' do
    it { is_expected.to have_many(:subscriptions) }
  end

  describe '.build_message' do
    let!(:channel) do
      create(
        :channel,
        subject: described_class::SHARED_COLLECTION_WITH_ME,
        msg_template: { 'data' => '%<shared_by>s shared %<label>s', 'action' => 'CollectionActions.fetch' },
      )
    end
    let(:data_args) { { shared_by: 'John Doe', label: 'My collection' } }

    it 'finds the channel by id' do
      message = described_class.build_message(channel_id: channel.id, data_args: data_args)

      expect(message['channel_id']).to eq channel.id
    end

    it 'finds the channel by subject' do
      message = described_class.build_message(channel_subject: channel.subject, data_args: data_args)

      expect(message['channel_id']).to eq channel.id
    end

    it 'fills the data template with the data args' do
      message = described_class.build_message(channel_id: channel.id, data_args: data_args)

      expect(message['data']).to eq 'John Doe shared My collection'
    end

    it 'keeps the other template keys and merges the extra args' do
      message = described_class.build_message(channel_id: channel.id, data_args: data_args, level: 'info')

      expect(message).to include('action' => 'CollectionActions.fetch', level: 'info')
      expect(message).not_to have_key(:data_args)
    end

    it 'does not change the stored template' do
      described_class.build_message(channel_id: channel.id, data_args: data_args)

      expect(channel.reload.msg_template['data']).to eq '%<shared_by>s shared %<label>s'
    end

    it 'returns nil when no channel matches' do
      expect(described_class.build_message(channel_subject: 'nope', data_args: data_args)).to be_nil
    end

    context 'when the channel has no template' do
      before { channel.update!(msg_template: nil) }

      it 'returns nil' do
        expect(described_class.build_message(channel_id: channel.id, data_args: data_args)).to be_nil
      end
    end
  end
end
