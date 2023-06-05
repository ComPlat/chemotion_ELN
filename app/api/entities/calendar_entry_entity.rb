# frozen_string_literal: true

module Entities
  class CalendarEntryEntity < Grape::Entity
    expose(
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

    delegate :eventable_type, :eventable_id, :creator, to: :object

    def notified_users
      object.instance_variable_get(:@notified_users) || object.notified_users
    end

    def element_name
      return if element.nil?

      if element.class.name.in?(%w[Screen ResearchPlan])
        element.name
      else
        "#{element.short_label} #{element.name}"
      end
    end

    def element_short_label
      return if element.nil?

      if element.class.name.in?(%w[Screen ResearchPlan])
        element.name
      else
        element.short_label
      end
    end

    def element_klass_icon
      if eventable_type == 'Element'
        element_klass&.icon_name
      elsif eventable_type.present?
        "icon-#{eventable_type.downcase}"
      end
    end

    def element_klass_name
      if eventable_type == 'Element'
        element_klass&.label
      else
        eventable_type
      end
    end

    def user_email
      creator&.email
    end

    def user_name_abbreviation
      creator&.name_abbreviation
    end

    def element
      return if eventable_type.nil?

      @element ||= object.instance_variable_get(:@element) || eventable_type.constantize.find(object.eventable_id)
    end

    def element_klass
      return if eventable_type != 'Element'

      @element_klass ||= object.instance_variable_get(:@element_klass) || element&.element_klass
    end

    def accessible
      instance_variable_defined?(:@accessible) ? object.instance_variable_get(:@accessible) : true
    end
  end
end
