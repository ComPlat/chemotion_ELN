class GenerateChannelsForCalendarEntries < ActiveRecord::Migration[6.1]
  def change
    Channel.create_with(
      channel_type: 8,
      msg_template: {
        "data": "%{creator_name} %{type} calendar entry %{kind}: %{range} %{title}.",
        "action": "CalendarActions.navigateToElement",
        "eventable_type": "%{eventable_type}",
        "eventable_id": "%{eventable_id}",
      }
    ).find_or_create_by(subject: Channel::CALENDAR_ENTRY)
  end
end
