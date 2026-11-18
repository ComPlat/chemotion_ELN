namespace :reactions do
  task populate_short_label: :environment do
    User.find_each do |u|
      counter = u.reactions.count
      u.counters["reactions"] = counter
      u.save!

      i = 1
      reactions = u.reactions.order('id ASC')
      reactions.each do |r|
        r.short_label = u.initials + "-R" + i.to_s
        r.save!
        i+=1
      end
    end
  end

  desc 'Repair reaction variations whose material keys are not among the reaction\'s own materials ' \
       '(copies keyed by the source reaction, keys of removed materials). Dry-run by default; pass [false] ' \
       "to write. Example: rake reactions:repair_variation_keys'[false]'"
  task :repair_variation_keys, [:dry_run] => :environment do |_t, args|
    dry_run = args[:dry_run] != 'false'
    puts(dry_run ? 'DRY RUN (nothing written) - pass [false] to write' : 'LIVE RUN - writing repaired variations')

    logger = ActiveSupport::Logger.new($stdout)
    result = Usecases::Reactions::RepairVariationMaterialKeys.new(apply: !dry_run, logger: logger).execute!

    puts "Checked #{result.checked} reaction(s) with variations; " \
         "#{dry_run ? 'would repair' : 'repaired'} #{result.repaired.size}; failed #{result.failed.size}."
    puts "Failed reaction ids: #{result.failed.join(', ')}" if result.failed.any?
  end
end
