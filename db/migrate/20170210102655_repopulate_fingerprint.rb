class RepopulateFingerprint < ActiveRecord::Migration
  def change
    Sample.reset_column_information
    # Extract all molecule
    Sample.all.each do |sample|
      next unless sample.fingerprint_id == nil

      sample.fingerprint_id = Fingerprint.find_or_create_by_molfile(sample.molfile.clone)
      sample.save!
    end
  end
end
