namespace :data do
  desc "molecule modifications for 20170215133510_create_element_tags"
  task ver_20170215133510_molecule: :environment do
    Molecule.all.each_slice(50) do |molecules|
      # Populate Molecule - PubChem tag
      pubchem_cids = nil
      iks = molecules.map(&:inchikey)
      pubchem_json = JSON.parse(PubChem.get_cids_from_inchikeys(iks))
      pubchem_list = pubchem_json["PropertyTable"]["Properties"]
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
