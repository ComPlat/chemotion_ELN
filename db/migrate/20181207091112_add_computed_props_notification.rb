class AddComputedPropsNotification < ActiveRecord::Migration[4.2]
  def change
    channel = Channel.find_by(subject: Channel::COMPUTED_PROPS_NOTIFICATION)
    return unless channel.nil?

    msg_template = '{"data": "", "action":"ElementActions.refreshComputedProp", "cprop": {}}'
    attributes = {
      subject: Channel::COMPUTED_PROPS_NOTIFICATION,
      channel_type: 8,
      msg_template: msg_template
    }
    Channel.create(attributes)
  end
end
