namespace :attachments do
  desc 'Unlocked every attachments that doesnt update more than 1 hour'
  task release_locked_attachments: :environment do
    Attachment.where(is_editing: true, updated_at: 1.week.ago..1.hour.ago).find_each do |att|
      att['is_editing'] = false
      att.save!
    end
  end
end
