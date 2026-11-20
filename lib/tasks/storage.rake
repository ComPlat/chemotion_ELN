# frozen_string_literal: true

namespace :storage do
  desc 'Archive a collection\'s old attachments to cold storage: rake storage:archive_collection[42]'
  task :archive_collection, [:collection_id] => :environment do |_task, args|
    id = args[:collection_id]
    abort 'usage: rake storage:archive_collection[COLLECTION_ID]' if id.blank?

    result = ArchiveAttachmentsJob.perform_now(id.to_i)
    puts "archived #{result[:archived]} attachment(s) from collection #{id}"

    next if result[:children].empty?

    # Sub-collections are not touched, so say so or a parent looks like a no-op.
    puts "collection #{id} has sub-collections: #{result[:children].join(', ')}"
    puts 'they were NOT included - run this task again for each of them'
  end
end
