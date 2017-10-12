# frozen_string_literal: true

# Module for tag behaviour
module Taggable
  extend ActiveSupport::Concern

  included do
    has_one :tag, as: :taggable, dependent: :destroy, class_name: 'ElementTag'
    before_save :update_tag_callback
  end

  def update_tag_callback
    args = is_a?(Molecule) && { pubchem_tag: true } || {
      analyses_tag: true, collection_tag: new_record?
    }
    update_tag(**args)
  end

  def update_tag(**args)
    build_tag(taggable_data: {}) if new_record? || !tag
    return if tag.destroyed?
    data = tag.taggable_data || {}
    data['reaction_id'] = args[:reaction_tag] if args[:reaction_tag]
    data['pubchem_cid'] = pubchem_tag if args[:pubchem_tag]
    data['analyses'] = analyses_tag if args[:analyses_tag]
    data['collection_labels'] = collection_tag if args[:collection_tag]
    tag.taggable_data = remove_blank_value(data)
  end

  def update_tag!(**args)
    update_tag(**args)
    tag.save!
  end

  def remove_blank_value(hash)
    hash.delete_if do |_, value| value.blank? end
  end

  def inchikey?
    inchikey && !inchikey.to_s.empty?
  end

  def pubchem_check
    inchikey? && tag.taggable_data&.fetch('pubchem_cid', nil)
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
    klass = "collections_#{self.class.name.underscore.pluralize}"
    send(klass).map { |cc|
      next unless c = cc.collection
      next if c.label == 'All' # TODO
      cid = collection_id(c)
      {
        name: c.label, is_shared: c.is_shared, user_id: c.user_id,
        id: cid, shared_by_id: c.shared_by_id,
        is_synchronized: c.is_synchronized
      }
    }
  end

  def grouped_analyses
    analyses.map(&:extended_metadata).map { |x| x.extract!('kind', 'status') }
            .group_by { |x| x['status'] }
  end

  def count_by_kind(analyses)
    analyses.group_by { |x| x['kind'] }.map { |k, v| [k, v.length] }.to_h
  end

  def analyses_tag
    return nil unless is_a?(Sample) && analyses.count.positive?
    grouped_analyses.map { |key, val|
      vv = count_by_kind(val)
      kk = key.to_s.downcase
      [kk, vv]
    }.to_h
  end

  def pubchem_response_check(json)
    prop = json.dig('PropertyTable', 'Properties')
    return nil unless prop.is_a?(Array)
    prop.first.dig('CID')
  end

  def pubchem_tag
    return nil unless is_a?(Molecule)
    return tag.taggable_data['pubchem_cid'] if pubchem_check
    pubchem_json = JSON.parse(PubChem.get_cids_from_inchikeys([inchikey]))
    pubchem_response_check pubchem_json
  end
end
