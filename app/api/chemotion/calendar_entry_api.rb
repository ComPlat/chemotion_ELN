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
        attributes = declared(params, include_missing: false)
        entry = current_user.calendar_entries.new(attributes)
        entry.save!

        if params[:notify_user_ids]&.any?
          params[:notify_user_ids].each do |user_id|
            entry.calendar_entry_notifications.create(user_id: user_id, status: :created)
          end

          SendCalendarEntryNotificationJob.perform_later(entry.id, params[:notify_user_ids], 'created')
        end

        present entry, with: Entities::CalendarEntryEntity
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
          attributes = declared(params, include_missing: false)
          entry = current_user.calendar_entries.find(params[:id])
          if entry.nil?
            error!('404 Calendar entry with supplied id not found', 404)
          else
            entry.update!(attributes)

            if params[:notify_user_ids]&.any?
              params[:notify_user_ids].each do |user_id|
                entry.calendar_entry_notifications.create(user_id: user_id, status: :updated)
              end

              SendCalendarEntryNotificationJob.perform_later(entry.id, params[:notify_user_ids], 'updated')
            end

            present entry, with: Entities::CalendarEntryEntity
          end
        end
      end

      desc 'get calendar entries'
      params do
        requires :start_time, type: DateTime, desc: 'calendar entry start date time'
        requires :end_time, type: DateTime, desc: 'calendar entry end date time'
        optional :created_by, type: Integer, desc: 'calendar entry created_by'
        optional :eventable_id, type: Integer, desc: 'calendar entry subject id'
        optional :eventable_type, type: String, desc: 'calendar entry subject type'
        optional :with_shared_collections, type: Boolean, desc: 'toggle for extended entry search'
      end
      get do
        collection_ids = current_user.collections.ids
        calender_entries_in_range = CalendarEntry.for_range(params[:start_time], params[:end_time]).includes(:creator)

        if params[:eventable_id].present? && params[:eventable_type].present? && params[:created_by].present?
          calender_entries = calender_entries_in_range.for_user(params[:created_by])
                                                      .or(calender_entries_in_range.for_event(params[:eventable_id], params[:eventable_type]))
        elsif params[:created_by].present?
          calender_entries = calender_entries_in_range.for_user(params[:created_by])

          if params[:with_shared_collections]
            user_ids = Collection.where(user_id: current_user.id, id: collection_ids)
                                 .or(Collection.where(shared_by_id: current_user.id, id: collection_ids))
                                 .pluck(:user_id, :shared_by_id).flatten
            user_ids += SyncCollectionsUser.where(user_id: current_user.id, id: collection_ids)
                                           .or(SyncCollectionsUser.where(shared_by_id: current_user.id, id: collection_ids))
                                           .pluck(:user_id, :shared_by_id).flatten
            user_ids = user_ids.uniq

            calender_entries = calender_entries.or(calender_entries_in_range.where(created_by: user_ids).where.not(eventable_id: nil))
          end
        else
          error!('405 Missing required params', 405)
        end

        # load elements and element klasses here to reduce n+1 queries in calendar entry entity
        elements = {}
        entry_ids_grouped_by_type = calender_entries.map { |entry| [entry.eventable_type, entry.eventable_id] }
                                                    .group_by { |a| a[0] }
                                                    .transform_values { |v| v.pluck(1) }
        entry_ids_grouped_by_type.each do |type, ids|
          next if type.nil?

          elements[type] = if type == 'Element'
                             type.constantize.where(id: ids).includes(:element_klass, :collections).index_by(&:id)
                           else
                             type.constantize.where(id: ids).includes(:collections).index_by(&:id)
                           end
        end
        collection_ids += current_user.sync_in_collections_users.pluck(:collection_id)
        calender_entries.each do |entry|
          next if entry.eventable_type.nil?

          element = elements.dig(entry.eventable_type, entry.eventable_id)

          entry.element = element
          entry.accessible = (collection_ids & (element&.collection_ids || [])).any?
          entry.element_klass = element&.element_klass if entry.eventable_type == 'Element'
        end

        present calender_entries, with: Entities::CalendarEntryEntity, root: :entries
      end

      desc 'get eventable users'
      params do
        requires :eventable_id, type: Integer, desc: 'calendar entry subject id'
        requires :eventable_type, type: String, desc: 'calendar entry subject type'
      end
      get 'eventable_users' do
        allowed_types = %w[Sample Reaction Element Wellplate Screen ResearchPlan]
        eventable = nil

        if allowed_types.include?(params['eventable_type'])
          model = params['eventable_type'].constantize
          eventable = model.find(params['eventable_id'])
        else
          error!('404 Calendar entry with eventable type not found', 404)
        end

        collections = eventable.collections
        user_ids = collections.map(&:user_id)
        user_ids += SyncCollectionsUser.where(collection_id: collections.map(&:id)).pluck(:user_id, :shared_by_id).flatten
        user_ids = user_ids.uniq - [current_user.id]

        users = User.where(id: user_ids)

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
