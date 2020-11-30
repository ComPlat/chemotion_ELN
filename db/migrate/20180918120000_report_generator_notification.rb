class ReportGeneratorNotification < ActiveRecord::Migration[4.2]
 def change
   channel = Channel.find_by(subject: Channel::REPORT_GENERATOR_NOTIFICATION)
   if (channel.nil?)
     attributes = {
       subject: Channel::REPORT_GENERATOR_NOTIFICATION,
       channel_type: 8,
       msg_template: '{"data": "%{report_name} is ready for download!",
                       "action":"ReportActions.updateProcessQueue",
                       "report_id": 0
                      }'
     }
     Channel.create(attributes)
   end

 end
end
