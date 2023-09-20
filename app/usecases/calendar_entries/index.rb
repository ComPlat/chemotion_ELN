# frozen_string_literal: true

module Usecases
  module CalendarEntries
    class Index
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
        @collection_ids ||= user.collections.ids + user.sync_in_collections_users.pluck(:collection_id)
      end

      def eventable?
        params[:eventable_id].present? &&
          params[:eventable_type].present? &&
          params[:eventable_type].constantize.where(id: params[:eventable_id]).for_user(user.id).any?
      end

      # find all calender entries (only own, own or shared for a specific event, own or shared by connected user)
      def calendar_entries
        @calendar_entries ||= begin
          all_entries_in_range = CalendarEntry.for_range(params[:start_time], params[:end_time])
                                              .includes(:creator, ordered_calendar_entry_notifications: :user)
          own_entries = all_entries_in_range.for_user(user.id)

          if eventable?
            event_entries = all_entries_in_range.for_event(params[:eventable_id], params[:eventable_type])
            own_entries.or(event_entries)
          elsif params[:with_shared_collections]
            own_entries.or(shared_entries(all_entries_in_range))
          else
            own_entries
          end
        end
      end

      def shared_entries(entries)
        entries.where(
          eventable: [
            Sample.joins(:collections).where(collections: { id: collection_ids }),
            Reaction.joins(:collections).where(collections: { id: collection_ids }),
            Labimotion::Element.joins(:collections).where(collections: { id: collection_ids }),
            Wellplate.joins(:collections).where(collections: { id: collection_ids }),
            ResearchPlan.joins(:collections).where(collections: { id: collection_ids }),
            Screen.joins(:collections).where(collections: { id: collection_ids }),
          ],
        )
      end

      # load elements and element klasses here to reduce later n+1 queries in calendar entry entities
      def elements
        @elements ||= begin
          elements = {}

          entry_ids_grouped_by_type.each do |type, ids|
            next if type.nil?

            elements[type] = if type == 'Labimotion::Element'
                               type.constantize.where(id: ids).includes(:element_klass, :collections).index_by(&:id)
                             else
                               type.constantize.where(id: ids).includes(:collections).index_by(&:id)
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
          entry.instance_variable_set(:@element_klass, element&.element_klass) if entry.eventable_type == 'Labimotion::Element'
          entry.instance_variable_set(:@accessible, (collection_ids & (element&.collection_ids || [])).any?)
          entry.instance_variable_set(:@notified_users, entry.notified_users)
        end

        calendar_entries
      end
    end
  end
end
