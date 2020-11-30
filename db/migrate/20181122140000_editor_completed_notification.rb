class EditorCompletedNotification < ActiveRecord::Migration[4.2]
 def change
   channel = Channel.find_by(subject: Channel::EDITOR_CALLBACK)
   channel.destroy if channel
   attributes = {
     subject: Channel::EDITOR_CALLBACK,
     channel_type: 8,
     msg_template: '{"data": "%{filename} has been updated.",
                     "action":"ElementActions.fetchResearchPlanById",
                     "research_plan_id": "%{research_plan_id}",
                     "attach_id": "%{attach_id}"
                    }'
   }
   Channel.create(attributes)
 end
end
