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
      described_class.send(:bulk_create_notifications, 1, 2, 3, [4, nil, '5', 'invalid'])

      expect(connection).to have_received(:exec_query).with(
        a_string_including('generate_notifications(1, 2,')
      )
      expect(connection).to have_received(:exec_query).with(
        a_string_including('3, ARRAY[4,5]::int[])')
      )
    end

    it 'does not execute SQL when required ids are invalid' do
      described_class.send(:bulk_create_notifications, nil, 2, 3, [4])

      expect(connection).not_to have_received(:exec_query)
    end
  end
end
