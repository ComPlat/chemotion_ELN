# frozen_string_literal: true

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
