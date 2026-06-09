# frozen_string_literal: true

# rubocop:disable RSpec/MultipleMemoizedHelpers
describe Chemotion::CalendarEntryAPI do
  include_context 'api request authorization context'

  let(:user_collection) { create(:collection, user: user) }
  let(:other_user) { create(:person) }
  let(:other_user_collection) { create(:collection, user: other_user) }
  let(:shared_collection) do
    create(:collection, user: user).tap do |collection|
      create(:collection_share, collection: collection, shared_with: other_user)
    end
  end
  let(:wellplate) { create(:wellplate, collections: [user_collection]) }
  let(:calendar_entry) { create(:calendar_entry, eventable: wellplate, creator: user) }

  describe 'GET /api/v1/calendar_entries' do
    let(:time) { Time.zone.parse('2023-06-01 13:00:00') }
    let(:reaction) { create(:reaction, collections: [user_collection, other_user_collection, shared_collection]) }
    let(:own_sample_calendar_entry_in_range) do
      create(
        :calendar_entry,
        eventable: create(:sample, creator: user, collections: [user_collection]),
        creator: user,
        start_time: time + 30.minutes,
        end_time: time + 1.hour,
      )
    end
    let(:own_reaction_calendar_entry_in_range) do
      create(
        :calendar_entry,
        eventable: reaction,
        creator: user,
        start_time: time + 30.minutes,
        end_time: time + 1.hour,
      )
    end
    let(:other_reaction_calendar_entry_in_range) do
      create(
        :calendar_entry,
        eventable: reaction,
        creator: other_user,
        start_time: time + 30.minutes,
        end_time: time + 1.hour,
      )
    end

    before do
      own_sample_calendar_entry_in_range
      own_reaction_calendar_entry_in_range
      _own_calendar_entry_out_of_range = create(
        :calendar_entry,
        :reaction,
        eventable: reaction,
        creator: user,
        start_time: time + 2.hours,
        end_time: time + 3.hours,
      )

      other_reaction_calendar_entry_in_range
      other_sample_calendar_entry_in_range = create(
        :calendar_entry,
        :sample,
        creator: other_user,
        start_time: time + 30.minutes,
        end_time: time + 1.hour,
      )
    end

    context 'with eventable type set' do
      let(:params) do
        {
          start_time: time,
          end_time: time + 1.hour,
          eventable_id: reaction.id,
          eventable_type: 'Reaction',
          with_shared_collections: false,
        }
      end

      it 'returns all owned and belonging to given reaction entries in range' do
        get '/api/v1/calendar_entries', params: params

        # returns always all own calendar entries in range
        expect(parsed_json_response['entries'].pluck('id').sort).to eq [
          own_reaction_calendar_entry_in_range.id,
          own_sample_calendar_entry_in_range.id,
          other_reaction_calendar_entry_in_range.id,
        ].sort
      end
    end

    context 'without eventable type set' do
      let(:params) do
        {
          start_time: time,
          end_time: time + 1.hour,
          with_shared_collections: false,
        }
      end

      it 'returns all created calendar entries in range' do
        get '/api/v1/calendar_entries', params: params

        # returns always all own calendar entries in range
        expect(parsed_json_response['entries'].pluck('id').sort).to eq [
          own_reaction_calendar_entry_in_range.id,
          own_sample_calendar_entry_in_range.id,
        ].sort
      end
    end

    context 'with shared collections set' do
      let(:params) do
        {
          start_time: time,
          end_time: time + 1.hour,
          with_shared_collections: true,
        }
      end

      it 'returns all owned and shared entries in range' do
        get '/api/v1/calendar_entries', params: params

        # returns always all own calendar entries in range
        expect(parsed_json_response['entries'].pluck('id').sort).to eq [
          own_reaction_calendar_entry_in_range.id,
          own_sample_calendar_entry_in_range.id,
          other_reaction_calendar_entry_in_range.id,
        ].sort
      end
    end

    context 'when another user shares a collection containing sample and reaction entries' do
      let(:collection_shared_to_user) do
        create(:collection, user: other_user).tap do |c|
          create(:collection_share, collection: c, shared_with: user)
        end
      end
      let(:shared_sample) { create(:sample, creator: other_user, collections: [collection_shared_to_user]) }
      let(:shared_reaction) { create(:reaction, collections: [collection_shared_to_user]) }
      let(:shared_sample_entry) do
        create(:calendar_entry,
               eventable: shared_sample,
               creator: other_user,
               start_time: time + 30.minutes,
               end_time: time + 1.hour)
      end
      let(:shared_reaction_entry) do
        create(:calendar_entry,
               eventable: shared_reaction,
               creator: other_user,
               start_time: time + 30.minutes,
               end_time: time + 1.hour)
      end

      before do
        shared_sample_entry
        shared_reaction_entry
      end

      it 'returns sample and reaction entries when with_shared_collections: true' do
        get '/api/v1/calendar_entries',
            params: { start_time: time, end_time: time + 1.hour, with_shared_collections: true }

        returned_ids = parsed_json_response['entries'].pluck('id')
        expect(returned_ids).to include(shared_sample_entry.id, shared_reaction_entry.id)
      end

      it 'does not return entries from the shared collection when with_shared_collections: false' do
        get '/api/v1/calendar_entries',
            params: { start_time: time, end_time: time + 1.hour, with_shared_collections: false }

        returned_ids = parsed_json_response['entries'].pluck('id')
        expect(returned_ids).not_to include(shared_sample_entry.id, shared_reaction_entry.id)
      end

      it 'returns entries for the sample when accessing the element-specific calendar via shared collection' do
        get '/api/v1/calendar_entries',
            params: {
              start_time: time,
              end_time: time + 1.hour,
              eventable_id: shared_sample.id,
              eventable_type: 'Sample',
              with_shared_collections: true,
            }

        expect(parsed_json_response['entries'].pluck('id')).to include(shared_sample_entry.id)
      end
    end

    context 'when an element belongs to multiple shared collections' do
      let(:collection_one) do
        create(:collection, user: other_user).tap do |c|
          create(:collection_share, collection: c, shared_with: user)
        end
      end
      let(:collection_two) do
        create(:collection, user: other_user).tap do |c|
          create(:collection_share, collection: c, shared_with: user)
        end
      end
      let(:sample_in_both) do
        create(:sample, creator: other_user, collections: [collection_one, collection_two])
      end
      let(:params) do
        { start_time: time, end_time: time + 1.hour, with_shared_collections: true }
      end
      let(:entry_for_sample) do
        create(:calendar_entry,
               eventable: sample_in_both,
               creator: other_user,
               start_time: time + 30.minutes,
               end_time: time + 1.hour)
      end

      before { entry_for_sample }

      it 'returns the entry exactly once without duplicates' do
        get '/api/v1/calendar_entries', params: params

        returned_ids = parsed_json_response['entries'].pluck('id')
        expect(returned_ids.count(entry_for_sample.id)).to eq 1
      end
    end

    context 'when a shared collection contains a device description entry' do
      let(:collection_shared_to_user) do
        create(:collection, user: other_user).tap do |c|
          create(:collection_share, collection: c, shared_with: user)
        end
      end
      let(:shared_device_description) do
        create(:device_description, created_by: other_user.id).tap do |dd|
          dd.collections_device_descriptions.create(collection_id: collection_shared_to_user.id)
        end
      end
      let(:shared_device_description_entry) do
        create(:calendar_entry,
               eventable: shared_device_description,
               creator: other_user,
               start_time: time + 30.minutes,
               end_time: time + 1.hour)
      end

      before { shared_device_description_entry }

      it 'returns the device description entry when with_shared_collections: true' do
        get '/api/v1/calendar_entries',
            params: { start_time: time, end_time: time + 1.hour, with_shared_collections: true }

        expect(parsed_json_response['entries'].pluck('id')).to include(shared_device_description_entry.id)
      end

      it 'returns entries when accessing the element-specific calendar for the shared device description' do
        get '/api/v1/calendar_entries',
            params: {
              start_time: time,
              end_time: time + 1.hour,
              eventable_id: shared_device_description.id,
              eventable_type: 'DeviceDescription',
              with_shared_collections: true,
            }

        expect(parsed_json_response['entries'].pluck('id')).to include(shared_device_description_entry.id)
      end
    end

    context 'with no entries in the requested time range' do
      let(:params) do
        { start_time: time + 5.hours, end_time: time + 6.hours, with_shared_collections: true }
      end

      it 'returns an empty entries array' do
        get '/api/v1/calendar_entries', params: params

        expect(parsed_json_response['entries']).to be_empty
      end
    end
  end

  describe 'POST /api/v1/calendar_entries' do
    let(:params) do
      {
        title: 'Title',
        start_time: Time.zone.parse('2023-06-01 13:00:00'),
        end_time: Time.zone.parse('2023-06-01 14:00:00'),
        description: 'Description',
        kind: 'availability',
      }
    end

    it 'returns the created calendar entry' do
      put "/api/v1/calendar_entries/#{calendar_entry.id}", params: params

      expect(parsed_json_response['title']).to eq 'Title'
    end
  end

  describe 'PUT /api/v1/calendar_entries/:id' do
    let(:another_user) { create(:person) }
    let(:params) do
      {
        title: 'New Title',
        start_time: Time.zone.parse('2023-06-01 13:00:00'),
        end_time: Time.zone.parse('2023-06-01 14:00:00'),
        description: 'New Description',
        kind: 'availability',
      }
    end

    it 'returns the updated calendar entry' do
      put "/api/v1/calendar_entries/#{calendar_entry.id}", params: params

      expect(parsed_json_response['kind']).to eq 'availability'
      expect(parsed_json_response['title']).to eq 'New Title'
    end
  end

  describe 'DELETE /api/v1/calendar_entries/:id' do
    let(:params) do
      {
        id: calendar_entry.id,
      }
    end

    it 'deletes the calendar entry' do
      delete "/api/v1/calendar_entries/#{calendar_entry.id}"

      expect(CalendarEntry.where(id: calendar_entry.id).count).to be 0
    end
  end

  describe 'GET /api/v1/calendar_entries/eventable_users' do
    let(:params) do
      {
        eventable_id: calendar_entry.eventable_id,
        eventable_type: calendar_entry.eventable_type,
      }
    end

    it 'returns users who have access to given eventable record' do
      another_user = create(:person)
      collection = create(:collection, user: user).tap do |collection|
        create(:collection_share, collection: collection, shared_with: another_user)
      end
      wellplate.collections_wellplates.create(collection_id: collection.id)

      get '/api/v1/calendar_entries/eventable_users', params: params

      expect(parsed_json_response['users'].pluck('id')).to eq [another_user.id]
    end
  end

  describe 'GET /api/v1/calendar_entries/ical' do
    let(:params) do
      {
        id: calendar_entry.id,
      }
    end

    it 'returns an ical file' do
      get '/api/v1/calendar_entries/ical', params: params

      expect(response.header['Content-Type']).to include 'text/calendar'
      expect(response.body).to include("BEGIN:VCALENDAR\r\n")
    end
  end
end
# rubocop:enable RSpec/MultipleMemoizedHelpers
