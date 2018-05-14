# Job to update molecule info for molecules with no CID
# associated CID (molecule tag) and iupac names (molecule_names) are updated if
# inchikey found in PC db
class PubchemCidJob < ActiveJob::Base
  # NB: PC has request restriction policy and timeout , hence the sleep_time and batch_size params
  # see http://pubchemdocs.ncbi.nlm.nih.gov/programmatic-access$_RequestVolumeLimitations
  def perform(sleep_time: 10, batch_size: 200)
    Molecule.joins("inner join element_tags et on et.taggable_id = molecules.id and et.taggable_type = 'Molecule'")
            .where(is_partial: false)
            .where("et.taggable_data->>'pubchem_cid' isnull")
            .find_in_batches(batch_size: batch_size) do |batch|
      iks = batch.pluck(:inchikey)

      ## This updates only cid
      # json = JSON.parse(PubChem.get_cids_from_inchikeys(iks))
      # props = json.dig('PropertyTable', 'Properties')
      # return nil unless prop.is_a?(Array)
      # props.each do |obj|
      #   m = Molecule.find_by(inchikey: obj["InChIKey"], is_partial: false)
      #   et = m.tag
      #   data = et.taggable_data || {}
      #   data["pubchem_cid"] = obj["CID"]
      #   et.update_columns!(taggable_data: data)
      # end

      ## This updates both the molecule cid and names
      pb_info = Chemotion::PubchemService.molecule_info_from_inchikeys(iks)
      pb_info.each do |obj|
        m = Molecule.find_by(inchikey: obj[:inchikey], is_partial: false)
        et = m.tag
        data = et.taggable_data || {}
        data['pubchem_cid'] = obj[:cid]
        et.update_columns(taggable_data: data)
        obj[:names].each do |name|
          MoleculeName.find_or_create_by(
            molecule_id: m.id,
            name: name,
            description: 'iupac_name'
          )
        end
      end
      sleep sleep_time
    end
  end
end
