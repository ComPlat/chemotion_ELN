class DoneEditLocallyNotification < ActiveRecord::Migration[5.2]
  def change
    channel = Channel.find_by(subject: Channel::DONE_EDIT_LOCALLY)
    channel.destroy if channel
    attributes = {
      subject: Channel::DONE_EDIT_LOCALLY,
      channel_type: 8,
      msg_template: {"data": "%{filename} has been updated.",
                      "attach_id": "%{attach_id}"
                     }
    }
    Channel.create(attributes)
  end
end
