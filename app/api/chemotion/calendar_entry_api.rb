# frozen_string_literal: true

module Chemotion
  class CalendarEntryAPI < Grape::API
    resource :calendar_entries do
      desc 'Create calendar entry'
      params do
        requires :title, type: String, desc: 'calendar entry title'
        requires :start_time, type: DateTime, desc: 'calendar entry start date time'
        requires :end_time, type: DateTime, desc: 'calendar entry end date time'
        optional :description, type: String, desc: 'calendar entry description'
        optional :kind, type: String, desc: 'calendar entry kind'
        optional :eventable_id, type: Integer, desc: 'calendar entry subject id'
        optional :eventable_type, type: String, desc: 'calendar entry subject type'
        optional :notify_user_ids, type: Array, desc: 'list of user ids to be notified about this event'
      end
      post do
        entry = Usecases::CalendarEntries::Create.new(
          params: declared(params, include_missing: false),
          user: current_user,
        ).perform!

        if entry.nil?
          error!('400 Calendar entry could not be created', 400)
        else
          present entry, with: Entities::CalendarEntryEntity
        end
      end

      desc 'Delete a calendar entry by id'
      params do
        requires :id, type: Integer, desc: 'calendar entry id'
      end
      route_param :id do
        delete do
          entry = current_user.calendar_entries.find(params[:id])

          if entry.nil?
            error!('404 Calendar entry with supplied id not found', 404)
          else
            present entry.destroy!, with: Entities::CalendarEntryEntity
          end
        end
      end

      desc 'Update calendar entry by id'
      params do
        requires :id, type: Integer, desc: 'calendar entry id'
        optional :title, type: String, desc: 'calendar entry title'
        optional :start_time, type: DateTime, desc: 'calendar entry start date time'
        optional :end_time, type: DateTime, desc: 'calendar entry end date time'
        optional :description, type: String, desc: 'calendar entry description'
        optional :kind, type: String, desc: 'calendar entry kind'
        optional :notify_user_ids, type: Array, desc: 'list of user ids to be notified about this event'
      end
      route_param :id do
        put do
          entry = Usecases::CalendarEntries::Update.new(
            params: declared(params, include_missing: false),
            user: current_user,
          ).perform!

          if entry.nil?
            error!('404 Calendar entry with supplied id not found', 404)
          else
            present entry, with: Entities::CalendarEntryEntity
          end
        end
      end

      desc 'get calendar entries'
      params do
        requires :start_time, type: DateTime, desc: 'calendar entry start date time'
        requires :end_time, type: DateTime, desc: 'calendar entry end date time'
        optional :eventable_id, type: Integer, desc: 'calendar entry subject id'
        optional :eventable_type, type: String, desc: 'calendar entry subject type'
        optional :with_shared_collections, type: Boolean, desc: 'toggle for extended entry search'
      end
      get do
        entries = Usecases::CalendarEntries::Index.new(
          params: params,
          user: current_user,
        ).perform!

        present entries, with: Entities::CalendarEntryEntity, root: :entries
      end

      desc 'get eventable users'
      params do
        requires :eventable_id, type: Integer, desc: 'calendar entry subject id'
        requires :eventable_type, type: String, desc: 'calendar entry subject type'
      end
      get 'eventable_users' do
        users = Usecases::CalendarEntries::Users.new(
          params: params,
          user: current_user,
        ).perform!

        { users: users.all.map { |user| { id: user.id, label: "#{user.name} (#{user.name_abbreviation})" } } }
      end

      desc 'download ical for calender entry'
      params do
        requires :id, type: Integer, desc: 'calendar entry id'
      end
      get 'ical' do
        entry = CalendarEntry.find(params[:id])

        content_type 'text/calendar'
        env['api.format'] = :binary
        header['Content-Disposition'] = "attachment; filename=\"#{entry.title.parameterize}.ics\""
        entry.ical_for(current_user)
      end
    end
  end
end
