class ReportGeneratorNotification < ActiveRecord::Migration
 def change
   channel = Channel.find_by(subject: Channel::REPORT_GENERATOR_NOTIFICATION)
   if (channel.nil?)
     attributes = {
       subject: Channel::REPORT_GENERATOR_NOTIFICATION,
       channel_type: 8,
       msg_template: '{"data": "%{report_name} is ready for downloaded!",
                       "action":"ReportActions.updateProcessQueue",
                       "report_id": "%{report_id}"
                      }'
     }
     Channel.create(attributes)
   end

 end
end
