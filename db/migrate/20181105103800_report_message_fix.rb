class ReportMessageFix < ActiveRecord::Migration
 def change
   channel = Channel.find_by(subject: Channel::REPORT_GENERATOR_NOTIFICATION)
   if (channel)
     channel.msg_template = '{"data": "%{report_name} is ready for download!",
                     "action":"ReportActions.updateProcessQueue",
                     "report_id": "%{report_id}"
                    }';
      channel.save!
   end
 end
end
