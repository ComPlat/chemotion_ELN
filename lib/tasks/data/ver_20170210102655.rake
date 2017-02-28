namespace :data do
  desc "data modifications for 20170210102655_repopulate_fingerprint"
  task ver_20170210102655: :environment do
    Sample.all.each do |sample|
      next unless sample.fingerprint_id == nil

      sample.fingerprint_id = Fingerprint.find_or_create_by_molfile(sample.molfile.clone)
      sample.save!
    end
  end
end
