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
      object.calendar_entry_notifications.includes(:user).order(created_at: :desc).map do |notification|
        "#{notification.user.name} - #{notification.created_at.strftime('%d.%m.%y %H:%M')} - #{notification.status}"
      end.join("\r\n")
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
      elsif !eventable_type.nil?
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

      @element ||= object.element || object.eventable_type.constantize.find(object.eventable_id)
    end

    def element_klass
      return if eventable_type != 'Element'

      @element_klass ||= element&.element_klass
    end
  end
end
