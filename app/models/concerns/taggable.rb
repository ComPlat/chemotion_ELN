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
      analyses: analyses
    }

    et.save!
  end
end
