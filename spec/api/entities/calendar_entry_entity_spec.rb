# frozen_string_literal: true

require 'rails_helper'

describe Entities::CalendarEntryEntity do
  describe '.represent' do
    subject(:entity) do
      described_class.represent(calendar_entry)
    end

    let(:calendar_entry) { create(:calendar_entry, :element) }

    it 'returns all necessary data' do
      expect(grape_entity_as_hash).to include(
        :id,
        :eventable_type,
        :eventable_id,
        :title,
        :description,
        :start_time,
        :end_time,
        :kind,
        :created_by,
        :user_name_abbreviation,
        :user_email,
        :element_name,
        :element_short_label,
        :element_klass_icon,
        :element_klass_name,
        :accessible,
        :notified_users,
      )
    end
  end
end
