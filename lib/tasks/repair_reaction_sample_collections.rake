# frozen_string_literal: true

namespace :collections do
  desc "Add each reaction's samples to the collections that hold the reaction. " \
       'Dry-run by default; pass [false] to write. ' \
       "Example: rake collections:repair_reaction_samples'[false]'"
  task :repair_reaction_samples, [:dry_run] => :environment do |_t, args|
    dry_run = args[:dry_run] != 'false'
    puts(dry_run ? 'DRY RUN (nothing written) - pass [false] to repair' : 'LIVE RUN - repairing memberships')

    results = RepairReactionSampleCollectionsTask.execute!(dry_run: dry_run)

    counts = results.group_by(&:action).transform_values(&:size)
    puts "#{dry_run ? 'Would add' : 'Added'} #{counts.fetch(:added, 0)} membership(s), " \
         "#{dry_run ? 'would revive' : 'revived'} #{counts.fetch(:revived, 0)} soft-deleted one(s); " \
         "#{counts.fetch(:cross_owner, 0)} left alone (sample owned by another user)."

    results.select { |r| r.action == :cross_owner }.each do |r|
      puts "  cross-owner: collection #{r.collection_id}, reaction #{r.reaction_id}, sample #{r.sample_id}"
    end
  end
end
