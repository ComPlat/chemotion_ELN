# == Schema Information
#
# Table name: calendar_entries
#
#  id             :bigint           not null, primary key
#  eventable_type :string
#  eventable_id   :bigint
#  title          :string
#  description    :string
#  start_time     :datetime
#  end_time       :datetime
#  kind           :string
#  created_by     :integer          not null
#  created_at     :datetime         not null
#  updated_at     :datetime         not null
#
# Indexes
#
#  index_calendar_entries_on_created_by                       (created_by)
#  index_calendar_entries_on_eventable_type_and_eventable_id  (eventable_type,eventable_id)
#
class CalendarEntry < ApplicationRecord
  belongs_to :eventable, polymorphic: true, optional: true
  belongs_to :creator, foreign_key: :created_by, class_name: 'User'

  has_many :calendar_entry_notifications, dependent: :destroy
  has_many :notified_users, through: :calendar_entry_notifications

  attribute :element_klass, type: ElementKlass
  attribute :element, type: Object
  attribute :accessible, type: :boolean, default: true
  attribute :notify_user_ids, type: :integer, array: true, default: []

  validates :title, :start_time, :end_time, presence: true

  scope :for_range, ->(start_time, end_time) { where('end_time > :start_time AND start_time < :end_time', start_time: start_time, end_time: end_time) }
  scope :for_event, ->(id, type) { where(eventable_id: id, eventable_type: type) if id && type }
  scope :for_user, ->(user_id) { where(created_by: user_id) if user_id }

  def ical_for(user)
    calendar = Icalendar::Calendar.new

    html_content = [
      description.gsub('\n', '<br>'),
      "Link: <a href=#{link_to_element_for(user)}>Show details</a>",
    ].compact.join('<br>')

    plain_text_content = [
      description,
      "Link: #{link_to_element_for(user)}",
    ].compact.join('\n')

    calendar.event do |event|
      event.dtstart = start_time.strftime('%Y%m%dT%H%M%SZ')
      event.dtend = end_time.strftime('%Y%m%dT%H%M%SZ')
      event.summary = title
      event.description = plain_text_content
      event.x_alt_desc = Icalendar::Values::Text.new(html_content, 'FMTTYPE' => 'text/html')
    end

    calendar.publish
    calendar.to_ical
  end

  def link_to_element_for(user)
    collection = collection_for(user)
    is_synchronized = collection.is_a?(SyncCollectionsUser)
    domain = if Rails.env.production?
               "https://#{ENV['HOST'] || ENV['SMTP_DOMAIN']}"
             else
               "http://#{ENV['HOST'] || 'localhost:3000'}"
             end


    "#{domain}/mydb/#{is_synchronized ? 's' : ''}collection/#{collection.id}/#{eventable_type.downcase}/#{eventable_id}"
  end

  def create_messages(user_ids, type)
    User.where(id: user_ids).find_each do |user|
      Message.create_msg_notification(
        channel_subject: Channel::CALENDAR_ENTRY,
        message_from: creator.id,
        message_to: [user.id],
        level: 'info',
        data_args: {
          creator_name: creator.name,
          type: type,
          kind: kind.capitalize,
          range: range,
          title: title,
        },
        eventable_type: eventable_type,
        eventable_id: eventable_id,
        url: link_to_element_for(user)
      )
    end
  end

  def send_emails(user_ids, type)
    User.where(id: user_ids).find_each do |user|
      CalendarMailer.send_mail(self, user, type).deliver_now
    end
  end

  def collection_for(user)
    collections = eventable_type.constantize.find(eventable_id)&.collections
    collections&.find_by(user_id: user.id) || SyncCollectionsUser.includes(:collection).find_by(user_id: user.id, collections: { id: collections.ids })
  end

  def range
    "#{I18n.l(start_time, format: :eln_timestamp)} - #{I18n.l(end_time, format: :eln_timestamp)}"
  end
end
