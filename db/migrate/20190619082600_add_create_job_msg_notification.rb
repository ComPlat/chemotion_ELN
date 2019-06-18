class AddCreateJobMsgNotification < ActiveRecord::Migration
  def change
    channel = Channel.find_by(subject: Channel::JOB_START_MSG)
    if (channel.nil?)
      attributes = {
        subject: Channel::JOB_START_MSG,
        channel_type: 5,
        msg_template: '{"data": "%{job_name} is created and been processing, this might take a while, you will get a message once it is completed. " }'
      }
      Channel.create(attributes)
    end
  end
end
