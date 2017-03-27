namespace :data do
  desc "data modifications for 20170215133510_create_element_tags"
  task ver_20170215133510: :environment do
    Sample.find_each do |sample|
      # Populate Sample - Collection tag
      et = sample.tag
      unless sample.tag
        et = ElementTag.new
        et.taggable_id = sample.id
        et.taggable_type = "Sample"
      end

      collections = sample.collections.where.not(label: 'All')
      collection_labels = collections.map { |c|
        collection_id =
          if c.is_synchronized
            SyncCollectionsUser.where(collection_id: c.id).first.id
          else
            c.id
          end

        {
          name: c.label, is_shared: c.is_shared, user_id: c.user_id,
          id: collection_id, shared_by_id: c.shared_by_id,
          is_synchronized: c.is_synchronized
        }
      }.uniq

      # Populate Sample - Reaction tag
      associated_reaction = [
        sample.reactions_as_starting_material,
        sample.reactions_as_product
      ].flatten.compact.uniq

      reaction_id = nil
      if associated_reaction.count > 0
        reaction_id = associated_reaction.first.id
      end

      # Populate Sample - Analyses tag
      analyses = nil
      if sample.analyses.count > 0
        group = sample.analyses.map(&:extended_metadata)
                      .map {|x| x.extract!("kind", "status") }
                      .group_by{|x| x["status"]}
        analyses = group.map { |key, val|
          new_val = val.group_by{|x| x["kind"]}.map{|k, v| [k, v.length]}
          [key.to_s.downcase, new_val.to_h]
        }.to_h
      end

      et.taggable_data = {
        collection_labels: collection_labels,
        reaction_id: reaction_id,
        analyses: analyses
      }
      et.save!
    end

    # Molecule.all.each_slice(50) do |molecules|
    #   # Populate Molecule - PubChem tag
    #   pubchem_cids = nil
    #   iks = molecules.map(&:inchikey)
    #   pubchem_json = JSON.parse(PubChem.get_cids_from_inchikeys(iks))
    #   pubchem_list = pubchem_json["PropertyTable"]["Properties"]
    #   molecule_pubchem = pubchem_list.map { |pub|
    #     { 
    #       id: Molecule.find_by(inchikey: pub["InChIKey"]).id,
    #       cid: pub["CID"]
    #     }
    #   }

    #   molecule_pubchem.each do |pub|
    #     et = pub.tag
    #     unless pub.tag
    #       et = ElementTag.new
    #       et.taggable_id = pub[:id]
    #       et.taggable_type = "Molecule"
    #     end

    #     et.taggable_data = {
    #       pubchem_cid: pub[:cid]
    #     }
    #     et.save!
    #   end
    # end

    Reaction.find_each do |reaction|
      # Populate Reaction - Collection tag
      collections = reaction.collections.where.not(label: 'All')
      collection_labels = collections.map { |c|
        collection_id =
          if c.is_synchronized
            SyncCollectionsUser.where(collection_id: c.id).first.id
          else
            c.id
          end

        {
          name: c.label, is_shared: c.is_shared, user_id: c.user_id,
          id: collection_id, shared_by_id: c.shared_by_id,
          is_synchronized: c.is_synchronized
        }
      }.uniq

      et = reaction.tag
      unless reaction.tag
        et = ElementTag.new
        et.taggable_id = reaction.id
        et.taggable_type = "Reaction"
      end

      et.taggable_data = {
        collection_labels: collection_labels
      }
      et.save!
    end

    Wellplate.find_each do |wellplate|
      # Populate Reaction - Collection tag
      collections = wellplate.collections.where.not(label: 'All')
      collection_labels = collections.map { |c|
        collection_id =
          if c.is_synchronized
            SyncCollectionsUser.where(collection_id: c.id).first.id
          else
            c.id
          end

        {
          name: c.label, is_shared: c.is_shared, user_id: c.user_id,
          id: collection_id, shared_by_id: c.shared_by_id,
          is_synchronized: c.is_synchronized
        }
      }.uniq

      et = wellplate.tag
      unless wellplate.tag
        et = ElementTag.new
        et.taggable_id = wellplate.id
        et.taggable_type = "Wellplate"
      end

      et.taggable_data = {
        collection_labels: collection_labels
      }
      et.save!
    end

    Screen.find_each do |screen|
      # Populate Reaction - Collection tag
      collections = screen.collections.where.not(label: 'All')
      collection_labels = collections.map { |c|
        collection_id =
          if c.is_synchronized
            SyncCollectionsUser.where(collection_id: c.id).first.id
          else
            c.id
          end

        {
          name: c.label, is_shared: c.is_shared, user_id: c.user_id,
          id: collection_id, shared_by_id: c.shared_by_id,
          is_synchronized: c.is_synchronized
        }
      }.uniq

      et = screen.tag
      unless screen.tag
        et = ElementTag.new
        et.taggable_id = screen.id
        et.taggable_type = "Screen"
      end

      et.taggable_data = {
        collection_labels: collection_labels
      }
      et.save!
    end

    ResearchPlan.find_each do |rp|
      # Populate ResearchPlan - Collection tag
      collections = rp.collections.where.not(label: 'All')
      collection_labels = collections.map { |c|
        collection_id =
          if c.is_synchronized
            SyncCollectionsUser.where(collection_id: c.id).first.id
          else
            c.id
          end

        {
          name: c.label, is_shared: c.is_shared, user_id: c.user_id,
          id: collection_id, shared_by_id: c.shared_by_id,
          is_synchronized: c.is_synchronized
        }
      }.uniq

      et = rp.tag
      unless rp.tag
        et = ElementTag.new
        et.taggable_id = rp.id
        et.taggable_type = "ResearchPlan"
      end

      et.taggable_data = {
        collection_labels: collection_labels
      }
      et.save!
    end
  end
end
