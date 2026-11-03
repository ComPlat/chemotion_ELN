# frozen_string_literal: true

# Keeps the material keys of a reaction's variations in step with the reaction's own materials.
#
# A variation stores per material group (see {MATERIAL_GROUPS}) a hash keyed by the variations key of a
# material: the sample id, or +"sbmm:<id>"+ for a sequence-based macromolecule sample. The Variations
# tab can only display keys of the reaction's current materials.
#
# {Usecases::Reactions::UpdateMaterials} reconciles the keys whenever it has (re)linked the materials:
# keys are translated through its exact key map (a copy is sent keyed by the materials' preliminary ids),
# keys of the source reaction (+origin+) are mapped by group position for copies, and what neither
# resolves is dropped. {Usecases::Reactions::RepairVariationMaterialKeys} does the same for stored data.
module ReactionVariationMaterialKeys
  extend ActiveSupport::Concern

  # Variations material group => the reaction association holding that group's samples, in position order.
  MATERIAL_GROUPS = {
    'startingMaterials' => :starting_materials,
    'reactants' => :reactants,
    'products' => :products,
    'solvents' => :solvents,
  }.freeze
  SBMM_KEY_PREFIX = 'sbmm:'

  # @param material_group [String] a material group as UpdateMaterials names it, e.g. +"starting_material"+
  # @return [String, nil] the variations group, or nil for groups without variations (purification solvents)
  def self.variations_group_for(material_group)
    association = material_group == 'reactant_sbmm' ? :reactants : :"#{material_group}s"
    MATERIAL_GROUPS.key(association)
  end

  # @return [String] the variations key of a sequence-based macromolecule sample
  def self.sbmm_key(id)
    "#{SBMM_KEY_PREFIX}#{id}"
  end

  # Variations keys of the reaction's materials, per group, in position order.
  #
  # @return [Hash{String => Array<String>}]
  def variation_material_keys
    MATERIAL_GROUPS.to_h do |group, association|
      # Query the links afresh (+scope+): a loaded association would return stale cached records.
      keys = association(association).scope.pluck(:id).map(&:to_s)
      if group == 'reactants'
        sbmm_ids = association(:reactant_sbmm_samples).scope.pluck(:id)
        keys += sbmm_ids.map { |sbmm_id| ReactionVariationMaterialKeys.sbmm_key(sbmm_id) }
      end
      [group, keys]
    end
  end

  # Returns the variations with every material key pointing at one of the reaction's own materials.
  #
  # Per group, the reaction's own keys are kept first. Every other key is then (1) translated through
  # +key_map+, or (2) when +origin_reaction+ is given, mapped to the reaction's material at the position
  # the key's material holds in that reaction, provided both are the same molecule (or the same
  # macromolecule for SBMM samples). A key that resolves to no free own key is dropped.
  #
  # @param key_map [Hash{String => Hash{String => String}}] group => client key => persisted key
  # @param origin_reaction [Reaction, nil] the reaction this one was copied from, already access-checked
  # @param on_drop [#call, nil] called with (group, key, entry) for each dropped key; logs a warning by default
  # @return [Array<Hash>] the reconciled variations (the receiver is not modified)
  def reconcile_variation_material_keys(key_map: {}, origin_reaction: nil, on_drop: nil)
    current = variations
    return current if current.blank?

    own_keys = variation_material_keys
    on_drop ||= ->(group, key, entry) { log_dropped_variation_key(group, key, entry) }
    fallback = lazy_origin_material_key_map(origin_reaction, own_keys)

    current.map do |variation|
      next variation unless variation.is_a?(Hash)

      MATERIAL_GROUPS.keys.reduce(variation.dup) do |updated, group|
        next updated unless updated[group].is_a?(Hash)

        candidates = ->(key) { [key_map.dig(group, key), fallback.call(group)[key]] }
        updated.merge(group => reconcile_variation_group(updated[group], group, own_keys[group], candidates, on_drop))
      end
    end
  end

  private

  # @param candidates [#call] key => own keys it may map to, in order of preference
  def reconcile_variation_group(entries, group, own_keys, candidates, on_drop)
    entries = entries.transform_keys(&:to_s)
    # Own keys first, so a mapped stale key can never push out the reaction's current entry.
    reconciled = entries.slice(*own_keys)
    entries.except(*own_keys).each do |key, entry|
      mapped = candidates.call(key).compact.find do |candidate|
        own_keys.include?(candidate) && !reconciled.key?(candidate)
      end
      next reconciled[mapped] = entry if mapped

      on_drop.call(group, key, entry)
    end
    reconciled
  end

  def log_dropped_variation_key(group, key, entry)
    Rails.logger.warn("Reaction #{id}: dropped variations #{group} key #{key} (#{entry.to_json.truncate(200)})")
  end

  # Returns a lambda group => (source key => own key), computing the map only once, when first needed.
  def lazy_origin_material_key_map(origin_reaction, own_keys)
    return ->(_group) { {} } if origin_reaction.nil? || origin_reaction.id == id

    map = nil
    lambda do |group|
      map ||= origin_material_key_map(origin_reaction, own_keys)
      map.fetch(group, {})
    end
  end

  # Maps the source reaction's material keys to the reaction's own, group by group, by position.
  # A pair is only kept when both are the same molecule (samples) or the same macromolecule (SBMM
  # samples); materials without either are never paired, so values can't reach an unrelated material.
  #
  # @return [Hash{String => Hash{String => String}}] group => source key => own key
  def origin_material_key_map(origin_reaction, own_keys)
    source_keys = origin_reaction.variation_material_keys
    identities = variation_key_identities(source_keys.values.flatten + own_keys.values.flatten)
    MATERIAL_GROUPS.keys.index_with { |group| same_identity_pairs(source_keys[group], own_keys[group], identities) }
  end

  def same_identity_pairs(source_keys, own_keys, identities)
    source_keys.zip(own_keys).select do |source_key, own_key|
      own_key && identities[source_key] && identities[source_key] == identities[own_key]
    end.to_h
  end

  # @return [Hash{String => Array}] variations key => [:molecule, id] or [:sbmm, macromolecule id]
  def variation_key_identities(keys)
    sbmm_keys, sample_keys = keys.partition { |key| key.start_with?(SBMM_KEY_PREFIX) }
    sample_identities(sample_keys).merge(sbmm_identities(sbmm_keys))
  end

  def sample_identities(keys)
    Sample.with_deleted.where(id: keys).where.not(molecule_id: nil).pluck(:id, :molecule_id)
          .to_h { |sample_id, molecule_id| [sample_id.to_s, [:molecule, molecule_id]] }
  end

  def sbmm_identities(keys)
    ids = keys.map { |key| key.delete_prefix(SBMM_KEY_PREFIX) }
    rows = SequenceBasedMacromoleculeSample.with_deleted.where(id: ids)
                                           .where.not(sequence_based_macromolecule_id: nil)
                                           .pluck(:id, :sequence_based_macromolecule_id)
    rows.to_h { |id, macromolecule_id| [ReactionVariationMaterialKeys.sbmm_key(id), [:sbmm, macromolecule_id]] }
  end
end
