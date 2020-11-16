# Job to update molecule info for molecules with no LCSS
# associated LCSS (molecule tag) is updated if cid found in PC db
class PubchemLcssJob < ApplicationJob
  queue_as :pubchemLcss

  # NB: PC has request restriction policy and timeout , hence the sleep_time and batch_size params
  # see http://pubchemdocs.ncbi.nlm.nih.gov/programmatic-access$_RequestVolumeLimitations
  def perform(sleep_time: 10, batch_size: 50)
    t_limit = Time.now + 2.hours

    mols = Molecule.select(:id).joins(:samples)
            .joins("inner join element_tags et on et.taggable_id = molecules.id and et.taggable_type = 'Molecule' ")
            .where("et.taggable_data->>'pubchem_cid' is not null")
            .where("et.taggable_data->>'pubchem_cid' ~ '^[0-9]+$'")
            .where("et.taggable_data->>'pubchem_lcss' is null")
            .uniq
            .find_in_batches(batch_size: batch_size) do |batch|

      batch.each do |mol|

        mol.pubchem_lcss
        # request every 0.5 second
        sleep 0.5

      end
      return if Time.now > t_limit
      sleep sleep_time
    end
  end

end
