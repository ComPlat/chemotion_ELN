module Taggable
  extend ActiveSupport::Concern

  included do
    has_one :tag, as: :taggable, dependent: :destroy, class_name: 'ElementTag'

    after_save :update_tag
  end

  def update_tag
    self.tag = ElementTag.create unless self.tag
    et = self.tag
    return if et.destroyed?

    et.taggable_id = self.id
    et.taggable_type = self.class

    # Populate Collections tag
    collections = self.collections.where.not(label: 'All')
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

    # Populate PubChem tag
    pubchem_cid = nil
    if self.class.to_s === 'Molecule'
       self.inchikey && !self.inchikey.to_s.empty? &&
       (!self.tag.taggable_data || !self.tag.taggable_data["pubchem_cid"])
      pubchem_json = JSON.parse(PubChem.get_cids_from_inchikeys([self.inchikey]))
      pubchem = pubchem_json["PropertyTable"]["Properties"].first
      if pubchem["CID"] && Float(pubchem["CID"])
        pubchem_cid = pubchem["CID"]
      end
    end

    # Populate Sample - Reaction tag
    reaction_id = nil
    analyses = nil

    if self.class.to_s === 'Sample'
      associated_reaction = [
        self.reactions_as_starting_material,
        self.reactions_as_product
      ].flatten.compact.uniq

      if associated_reaction.count > 0
        reaction_id = associated_reaction.first.id
      end


      # Populate Sample - Analyses tag
      if self.analyses.count > 0
        group = self.analyses.map(&:extended_metadata)
                    .map {|x| x.extract!("kind", "status") }
                    .group_by{|x| x["status"]}

        analyses = group.map { |key, val|
          new_val = val.group_by{|x| x["kind"]}.map{|k, v| [k, v.length]}
          [key.to_s.downcase, new_val.to_h]
        }.to_h
      end
    end

    et.taggable_data = {
      collection_labels: collection_labels,
      reaction_id: reaction_id,
      analyses: analyses,
      pubchem_cid: pubchem_cid,
    }
    et.taggable_data.delete_if { |key, value| value.blank? }

    et.save!
  end
end
