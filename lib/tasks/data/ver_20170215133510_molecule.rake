namespace :data do
  desc "molecule modifications for 20170215133510_create_element_tags"
  task ver_20170215133510_molecule: :environment do
    Molecule.all.each_slice(50) do |molecules|
      # Populate Molecule - PubChem tag
      pubchem_cids = nil
      # nil when the request failed or PubChem answered with a Fault, which it does for a
      # throttled batch. Skip that slice rather than passing nil to JSON.parse, which would
      # abort the whole run on the first bad batch.
      body = PubChem.get_cids_from_inchikeys(molecules.map(&:inchikey))
      pubchem_list = body.presence && JSON.parse(body).dig('PropertyTable', 'Properties')
      next if pubchem_list.blank?

      molecule_pubchem = pubchem_list.map { |pub|
        {
          id: Molecule.find_by(inchikey: pub["InChIKey"]).id,
          cid: pub["CID"]
        }
      }

      molecule_pubchem.each do |pub|
        et = ElementTag.find_by(taggable_type: "Molecule", taggable_id: pub[:id])
        unless et
          et = ElementTag.new(taggable_type: "Molecule", taggable_id: pub[:id])
        end

        et.taggable_data = {
          pubchem_cid: pub[:cid]
        }
        et.save!
      end
    end
  end
end
