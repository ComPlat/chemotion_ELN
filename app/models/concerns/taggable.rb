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
    data['wellplate_id'] = args[:wellplate_tag] if args[:wellplate_tag]
    data['element'] = args[:element_tag] if args[:element_tag]
    data['pubchem_cid'] = pubchem_tag if args[:pubchem_tag]
    data['analyses'] = analyses_tag if args[:analyses_tag]
    data['collection_ids'] = collection_id if args[:collection_tag]
    tag.taggable_data = remove_blank_value(data)
  end

  def update_tag!(**args)
    update_tag(**args)
    tag.save! unless tag.destroyed?
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

  # Populate Collection ids as tag
  def collection_id
    klass = "collections_#{self.class.name.underscore.pluralize}"
    return unless respond_to?(klass)
    send(klass).pluck(:id)
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

  def pubchem_tag
    return nil unless is_a?(Molecule)
    return tag.taggable_data['pubchem_cid'] if pubchem_check
    self.pcid.presence || PubChem.get_cid_from_inchikey(inchikey)
  end
end
