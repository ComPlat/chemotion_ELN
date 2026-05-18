# frozen_string_literal: true

module Usecases
  module CalendarEntries
    class Index
      ALLOWED_EVENTABLE_TYPES = %w[
        Sample Reaction Labimotion::Element Wellplate ResearchPlan Screen DeviceDescription
      ].freeze
      EVENTABLE_TYPE_CLASS_MAP = {
        'Sample' => Sample,
        'Reaction' => Reaction,
        'Labimotion::Element' => Labimotion::Element,
        'Wellplate' => Wellplate,
        'ResearchPlan' => ResearchPlan,
        'Screen' => Screen,
        'DeviceDescription' => DeviceDescription,
      }.freeze

      attr_accessor :params, :user

      def initialize(params:, user:)
        @params = params
        @user = user
      end

      def perform!
        return CalendarEntry.none unless params[:start_time].present? && params[:end_time].present?

        calendar_entries_with_preloaded_elements
      end

      private

      def collection_ids
        @collection_ids ||= Collection.unscoped.where(deleted_at: nil).accessible_for(user).ids
      end

      def eventable?
        return false unless params[:eventable_id].present? && params[:eventable_type].present?
        return false unless ALLOWED_EVENTABLE_TYPES.include?(normalized_eventable_type)

        eventable_accessible?
      end

      def eventable_accessible?
        eventable_class = EVENTABLE_TYPE_CLASS_MAP[normalized_eventable_type]
        return false if eventable_class.nil?

        eventable_class.where(id: params[:eventable_id])
                       .joins(:collections).where(collections: { id: collection_ids }).any?
      end

      def normalized_eventable_type
        params[:eventable_type].camelize
      end

      # find all calender entries (only own, own or shared for a specific event, own or shared by connected user)
      def calendar_entries
        @calendar_entries ||= begin
          all_entries_in_range = CalendarEntry.for_range(params[:start_time], params[:end_time])
                                              .includes(:creator, ordered_calendar_entry_notifications: :user)
          own_entries = all_entries_in_range.for_user(user.id)

          if eventable?
            event_entries = all_entries_in_range.for_event(params[:eventable_id], normalized_eventable_type)
            own_entries.or(event_entries)
          elsif params[:with_shared_collections]
            own_entries.or(shared_entries(all_entries_in_range))
          else
            own_entries
          end
        end
      end

      def shared_entries(entries)
        shared_eventables = build_shared_eventables_query
        return entries.none if shared_eventables.empty?

        shared_eventables.reduce(entries.none) do |result, (type, ids)|
          result.or(entries.where(eventable_type: type, eventable_id: ids))
        end
      end

      def build_shared_eventables_query
        return {} if collection_ids.empty?

        connection = ActiveRecord::Base.connection
        union_sql = EVENTABLE_TYPE_CLASS_MAP.map do |type, klass|
          klass.joins(:collections)
               .where(collections: { id: collection_ids })
               .distinct
               .select("#{connection.quote(type)} AS eventable_type, #{klass.table_name}.id AS eventable_id")
               .to_sql
        end.join(' UNION ')

        connection.select_all("SELECT eventable_type, eventable_id FROM (#{union_sql}) AS t")
                  .group_by { |r| r['eventable_type'] }
                  .transform_values { |v| v.map { |r| r['eventable_id'] } }
      end

      # load elements and element klasses here to reduce later n+1 queries in calendar entry entities
      def elements
        @elements ||= begin
          elements = {}

          entry_ids_grouped_by_type.each do |type, ids|
            next if type.nil?

            normalized_type = type.camelize
            klass = normalized_type.constantize
            elements[type] = if normalized_type == 'Labimotion::Element'
                               klass.where(id: ids).includes(:element_klass, :collections).index_by(&:id)
                             else
                               klass.where(id: ids).includes(:collections).index_by(&:id)
                             end
          end

          elements
        end
      end

      def entry_ids_grouped_by_type
        calendar_entries.map { |entry| [entry.eventable_type, entry.eventable_id] }
                        .group_by { |type, _id| type }
                        .transform_values { |v| v.pluck(1) }
      end

      # iterate trough entries and assign some attribute to prevent n+1 queries in calendar_entry_entity class
      def calendar_entries_with_preloaded_elements
        calendar_entries.each do |entry|
          next if entry.eventable_type.nil?

          element = elements.dig(entry.eventable_type, entry.eventable_id)

          entry.instance_variable_set(:@element, element)
          if entry.eventable_type == 'Labimotion::Element'
            entry.instance_variable_set(:@element_klass, element&.element_klass)
          end
          entry.instance_variable_set(:@accessible, (collection_ids & (element&.collection_ids || [])).any?)
          entry.instance_variable_set(:@notified_users, entry.notified_users)
          entry.instance_variable_set(:@notify_user_ids, entry.calendar_entry_notifications.map(&:user_id))
        end

        calendar_entries
      end
    end
  end
end
