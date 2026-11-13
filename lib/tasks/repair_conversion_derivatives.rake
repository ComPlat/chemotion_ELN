# frozen_string_literal: true

namespace :attachments do
  desc 'Repair TIFF conversion derivatives recorded without storage/metadata, which Shrine ' \
       'cannot load. Dry-run by default; pass [false] to write. ' \
       "Example: rake attachments:repair_conversion_derivatives'[false]'"
  task :repair_conversion_derivatives, [:dry_run] => :environment do |_t, args|
    dry_run = args[:dry_run] != 'false'
    puts(dry_run ? 'DRY RUN (nothing written) - pass [false] to repair' : 'LIVE RUN - repairing entries')

    results = RepairConversionDerivativesTask.execute!(dry_run: dry_run)

    counts = results.group_by(&:action).transform_values(&:size)
    puts "#{dry_run ? 'Would repair' : 'Repaired'} #{results.size} attachment(s): " \
         "#{counts.fetch(:rewritten, 0)} entry(ies) rewritten, " \
         "#{counts.fetch(:removed, 0)} removed (PNG missing, regenerated on next preview), " \
         "#{counts.fetch(:skipped, 0)} skipped (storage not configured)."
  end
end
