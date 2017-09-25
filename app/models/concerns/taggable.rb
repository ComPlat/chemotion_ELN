# frozen_string_literal: true

# Module for tag behaviour
module Taggable
  extend ActiveSupport::Concern

  included do
    has_one :tag, as: :taggable, dependent: :destroy, class_name: 'ElementTag'

    after_save :update_tag
  end

  def update_tag
    self.tag = ElementTag.new unless tag
    return if tag.destroyed?
    tag.taggable_id = id
    tag.taggable_type = self.class
    tag.taggable_data = remove_blank_value(populate_taggable_data)
    tag.save!
  end

  def remove_blank_value(hash)
    hash.delete_if do |_, value| value.blank? end
  end

  def inchikey?
    inchikey && !inchikey.to_s.empty?
  end

  def pubchem_check
    inchikey? && tag.taggable_data&.fetch('pubchem_cid',nil)
  end

  def collection_id(c)
    if c.is_synchronized
      SyncCollectionsUser.where(collection_id: c.id).first.id
    else
      c.id
    end
  end

  # Populate Collections tag
  def collection_tag
    collections.where.not(label: 'All').map { |c|
      cid = collection_id(c)
      {
        name: c.label, is_shared: c.is_shared, user_id: c.user_id,
        id: cid, shared_by_id: c.shared_by_id,
        is_synchronized: c.is_synchronized
      }
    }.uniq
  end

  def reaction_tag
    return nil unless self.class.to_s == 'Sample'
    associated_reaction = [
      reactions_as_starting_material,
      reactions_as_product
    ].flatten.compact.uniq

    associated_reaction.count.positive? ? associated_reaction.first.id : nil
  end

  def grouped_analyses
    analyses.map(&:extended_metadata).map { |x| x.extract!('kind', 'status') }
            .group_by { |x| x['status'] }
  end

  def count_by_kind(analyses)
    analyses.group_by { |x| x['kind'] }.map { |k, v| [k, v.length] }.to_h
  end

  def analyses_tag
    return nil unless self.class.to_s == 'Sample' && analyses.count.positive?
    grouped_analyses.map { |key, val|
      vv = count_by_kind(val)
      kk = key.to_s.downcase
      [kk, vv]
    }.to_h
  end

  def pubchem_response_check(json)
    prop = json.dig('PropertyTable', 'Properties')
    return nil unless prop.class == Array
    prop.first.dig('CID')
  end

  def pubchem_tag
    return nil unless self.class.to_s == 'Molecule'
    return tag.taggable_data['pubchem_cid'] if pubchem_check
    pubchem_json = JSON.parse(PubChem.get_cids_from_inchikeys([inchikey]))
    pubchem_response_check pubchem_json
  end

  def populate_taggable_data
    {
      collection_labels: collection_tag,
      reaction_id: reaction_tag,
      analyses: analyses_tag,
      pubchem_cid: pubchem_tag,
    }
  end
end
