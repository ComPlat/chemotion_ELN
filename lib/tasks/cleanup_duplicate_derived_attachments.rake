# frozen_string_literal: true

namespace :attachments do
  desc 'Clean up stray duplicate JCAMP-derived attachments left over from before the ' \
       'generate_att dedup fix (PR #3494). Dry-run by default; pass [false] to actually ' \
       "delete. Example: rake attachments:cleanup_duplicate_derived_attachments'[false]'"
  task :cleanup_duplicate_derived_attachments, [:dry_run] => :environment do |_t, args|
    dry_run = args[:dry_run] != 'false'
    puts(
      dry_run ? 'DRY RUN (no rows deleted) - pass [false] to actually delete' : 'LIVE RUN - deleting duplicates',
    )

    results = CleanupDuplicateDerivedAttachmentsTask.execute!(dry_run: dry_run)

    removed_count = results.sum { |r| r.removed_ids.size }
    puts "#{dry_run ? 'Would remove' : 'Removed'} #{removed_count} duplicate row(s) across #{results.size} group(s)."
  end
end
