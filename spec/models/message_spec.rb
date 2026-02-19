# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Message do
  describe '.bulk_create_notifications' do
    let(:connection) { instance_double(ActiveRecord::ConnectionAdapters::PostgreSQLAdapter) }

    before do
      allow(ApplicationRecord).to receive(:connection).and_return(connection)
      allow(connection).to receive(:exec_query)
    end

    it 'removes invalid receiver ids before building SQL' do
      described_class.send(:bulk_create_notifications, 1, 2, 3, [4, nil, '5', 5.9, 'invalid'])

      expect(connection).to have_received(:exec_query).with(
        a_string_including('generate_notifications(1, 2,'),
      )
      expect(connection).to have_received(:exec_query).with(
        a_string_including('3, ARRAY[4,5]::int[])'),
      )
    end

    it 'does not execute SQL when receiver_ids is empty' do
      described_class.send(:bulk_create_notifications, 1, 2, 3, [])

      expect(connection).not_to have_received(:exec_query)
    end

    it 'does not execute SQL when receiver_ids is nil' do
      described_class.send(:bulk_create_notifications, 1, 2, 3, nil)

      expect(connection).not_to have_received(:exec_query)
    end

    it 'does not execute SQL when all receiver_ids are invalid' do
      described_class.send(:bulk_create_notifications, 1, 2, 3, [nil, 'invalid'])

      expect(connection).not_to have_received(:exec_query)
    end

    it 'does not execute SQL when message_id is nil' do
      described_class.send(:bulk_create_notifications, 1, nil, 3, [4])

      expect(connection).not_to have_received(:exec_query)
    end

    it 'does not execute SQL when message_id is a float' do
      described_class.send(:bulk_create_notifications, 1, 2.9, 3, [4])

      expect(connection).not_to have_received(:exec_query)
    end

    it 'does not execute SQL when user_id is nil' do
      described_class.send(:bulk_create_notifications, 1, 2, nil, [4])

      expect(connection).not_to have_received(:exec_query)
    end

    it 'does not execute SQL when channel_id is nil' do
      described_class.send(:bulk_create_notifications, nil, 2, 3, [4])
      expect(connection).not_to have_received(:exec_query)
    end

    it 'does not execute SQL when all required ids are invalid' do
      described_class.send(:bulk_create_notifications, 'invalid', nil, 'not-an-id', [4])

      expect(connection).not_to have_received(:exec_query)
    end
  end
end
