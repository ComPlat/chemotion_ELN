class SendIndividualUsersNotification < ActiveRecord::Migration[4.2]
 def change
   channel = Channel.find_by(subject: Channel::SEND_INDIVIDUAL_USERS)
   if (channel.nil?)
     attributes = {
       subject: Channel::SEND_INDIVIDUAL_USERS,
       channel_type: 8
     }
     Channel.create(attributes)
   end

 end
end
