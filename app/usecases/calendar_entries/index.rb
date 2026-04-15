# frozen_string_literal: true

module Usecases
  module CalendarEntries
    class Index
      ALLOWED_EVENTABLE_TYPES = %w[
        Sample Reaction Labimotion::Element Wellplate ResearchPlan Screen DeviceDescription
      ].freeze

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
        if normalized_eventable_type == 'DeviceDescription'
          # Device descriptions are shared booking calendars — show all entries to anyone with access
          DeviceDescription.where(id: params[:eventable_id])
                           .joins(:collections).where(collections: { id: collection_ids }).any?
        else
          # For other types, only show all entries if the user owns the collection
          normalized_eventable_type.constantize.where(id: params[:eventable_id]).for_user(user.id).any?
        end
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
        types = %w[Sample Reaction Labimotion::Element Wellplate ResearchPlan Screen DeviceDescription]
        types.each_with_object({}) do |type, result|
          ids = type.constantize.joins(:collections).where(collections: { id: collection_ids }).pluck(:id)
          result[type] = ids if ids.any?
        end
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
        end

        calendar_entries
      end
    end
  end
end
