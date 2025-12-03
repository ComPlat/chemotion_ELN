# frozen_string_literal: true

# rubocop: disable Metrics/CyclomaticComplexity,Metrics/PerceivedComplexity,Metrics/AbcSize, Naming/MethodParameterName, Lint/AssignmentInCondition

# Module for tag behaviour
module Taggable
  extend ActiveSupport::Concern

  included do
    has_one :tag, as: :taggable, dependent: :destroy, class_name: 'ElementTag'
    before_save :update_tag_callback
  end

  def update_tag_callback
    args = (is_a?(Molecule) && { pubchem_tag: true }) || {
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
    data['collection_labels'] = collection_tag if args[:collection_tag]
    data['resources'] = resources_tag if args[:resources_tag]
    tag.taggable_data = remove_blank_value(data)
  end

  def update_tag!(**args)
    update_tag(**args)
    tag.save! unless tag.destroyed?
  end

  def remove_blank_value(hash)
    hash.compact_blank!
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

  # Populate resources tag
  def resources_tag
    return unless is_a?(Sample)

    resources = []
    reactions_samples&.includes(:reaction)&.each do |rs|
      next unless r = rs.reaction
      next if r.deleted_at.present?

      resources.push({
                       resource_context_type: 'Reaction',
                       resource_context_id: r.id,
                       resource_context_label: r.short_label,
                     })
    end
    elements_samples&.each do |es|
      e = Labimotion::Element.find_by(id: es.element_id)
      next if e.nil? || e.deleted_at.present?

      ek = e.element_klass
      next if ek.nil?

      resources.push({
                       resource_context_type: ek.label,
                       resource_context_id: e.id,
                       resource_context_label: e.short_label,
                     })
    end

    resources
  end
  # Populate Collections tag
  def collection_tag
    klass = Labimotion::Utils.col_by_element(self.class.name).underscore.pluralize
    klass = 'collections_celllines' if klass == 'collections_cellline_samples'
    return unless respond_to?(klass)

    cols = []
    send(klass).each do |cc|
      next unless c = cc.collection
      next if c.label == 'All' && c.is_locked

      cols.push({
                  name: c.label, is_shared: c.is_shared, user_id: c.user_id,
                  id: c.id, shared_by_id: c.shared_by_id,
                  is_synchronized: false
                })
      next unless c.is_synchronized

      c.sync_collections_users&.each do |syn|
        cols.push({
                    name: c.label, is_shared: c.is_shared, user_id: syn.user_id,
                    id: syn.id, shared_by_id: syn.shared_by_id,
                    is_synchronized: c.is_synchronized
                  })
      end
    end
    cols
  end

  def grouped_analyses
    analyses.map(&:extended_metadata).map { |x| x.extract!('kind', 'status') }
            .group_by { |x| x['status'] }
  end

  def count_by_kind(analyses)
    analyses.group_by { |x| x['kind'] }.transform_values(&:length)
  end

  def analyses_tag
    return nil unless is_a?(Sample) && analyses.count.positive?

    grouped_analyses.to_h do |key, val|
      vv = count_by_kind(val)
      kk = key.to_s.downcase
      [kk, vv]
    end
  end

  def pubchem_tag
    return nil unless is_a?(Molecule)
    return tag.taggable_data['pubchem_cid'] if pubchem_check

    pcid.presence || PubChem.get_cid_from_inchikey(inchikey)
  end

  def user_labels
    tag&.taggable_data&.fetch('user_labels', [])
  end
end
# rubocop: enable Metrics/CyclomaticComplexity,Metrics/PerceivedComplexity,Metrics/AbcSize, Naming/MethodParameterName, Lint/AssignmentInCondition
