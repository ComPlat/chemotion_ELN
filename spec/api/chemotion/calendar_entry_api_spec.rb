# frozen_string_literal: true

describe Chemotion::CalendarEntryAPI do
  include_context 'api request authorization context'

  let(:creator) { user }
  let(:calendar_entry) { create(:calendar_entry, :wellplate, creator: creator) }
  let(:wellplate) { calendar_entry.eventable }

  describe 'GET /api/v1/calendar_entries' do
    let(:time) { Time.zone.parse('2023-06-01 13:00:00') }
    let(:another_user) { create(:person) }
    let(:reaction) { create(:reaction) }
    let(:own_sample_calendar_entry_in_range) do
      create(
        :calendar_entry,
        :sample,
        creator: creator,
        start_time: time + 30.minutes,
        end_time: time + 1.hour,
      )
    end
    let(:own_reaction_calendar_entry_in_range) do
      create(
        :calendar_entry,
        :reaction,
        eventable: reaction,
        creator: creator,
        start_time: time + 30.minutes,
        end_time: time + 1.hour,
      )
    end
    let(:other_reaction_calendar_entry_in_range) do
      create(
        :calendar_entry,
        :reaction,
        eventable: reaction,
        creator: another_user,
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
        creator: creator,
        start_time: time + 2.hours,
        end_time: time + 3.hours,
      )

      other_reaction_calendar_entry_in_range
      other_sample_calendar_entry_in_range = create(
        :calendar_entry,
        :sample,
        creator: another_user,
        start_time: time + 30.minutes,
        end_time: time + 1.hour,
      )

      collection = create(:collection, user_id: creator.id)
      reaction.collections_reactions.create(collection_id: collection.id)
      own_sample_calendar_entry_in_range.eventable.collections_samples.create(collection_id: collection.id)

      another_collection = create(:collection, user_id: another_user.id)
      reaction.collections_reactions.create(collection_id: another_collection.id)
      other_sample_calendar_entry_in_range.eventable.collections_samples.create(collection_id: another_collection.id)

      shared_collection = create(
        :collection,
        user_id: creator.id,
        shared_by_id: another_user.id,
        is_shared: true,
        is_locked: true,
        parent: another_collection,
      )
      reaction.collections_reactions.create(collection_id: shared_collection.id)
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
      collection = create(:collection, user_id: creator.id)
      wellplate.collections_wellplates.create(collection_id: collection.id)

      _another_user = create(:person)

      sync_user = create(:person)
      _sync_collection = collection.sync_collections_users.create(user: sync_user, sharer: creator)

      get '/api/v1/calendar_entries/eventable_users', params: params

      expect(parsed_json_response['users'].pluck('id')).to eq [sync_user.id]
    end
  end

  describe 'GET /api/v1/calendar_entries/ical' do
    let(:params) do
      {
        id: calendar_entry.id,
      }
    end

    it 'returns an ical file' do
      collection = create(:collection, user_id: creator.id)
      wellplate.collections_wellplates.create(collection_id: collection.id)

      get '/api/v1/calendar_entries/ical', params: params

      expect(response.header['Content-Type']).to include 'text/calendar'
      expect(response.body).to include("BEGIN:VCALENDAR\r\n")
    end
  end
end
