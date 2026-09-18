# frozen_string_literal: true

class SampleMergeService
  class MergeError < StandardError
    attr_reader :http_status

    def initialize(message = nil, http_status: 422)
      super(message)
      @http_status = http_status
    end
  end

  DUMMY_INCHIKEY = 'DUMMY'
  MERGEABLE_GROUPS = %i[reactions_product_samples reactions_reactant_samples].freeze

  def initialize(current_user:)
    @user = current_user
  end

  def merge!(source_id:, target_id:, reaction_id:)
    source   = Sample.find(source_id)
    target   = Sample.find(target_id)
    reaction = Reaction.find(reaction_id)

    validate_merge!(source, target, reaction)
    ActiveRecord::Base.transaction { apply_merge!(source, target, reaction) }
    target.reload
  end

  def unmerge!(merge_id:)
    merge  = SampleMerge.find(merge_id)
    source = merge.source_sample
    target = merge.target_sample

    authorized = can_update?(source) && can_update?(target) && can_update?(merge.reaction)
    raise MergeError.new('Unauthorized', http_status: 401) unless authorized
    raise MergeError, 'cannot unmerge from a sample that has itself been merged upstream' if target.is_legacy

    ActiveRecord::Base.transaction { apply_unmerge!(merge, source, target) }
    target.reload
  end

  private

  def apply_merge!(source, target, reaction)
    snapshot               = original_target_snapshot(target)
    target_molecule_before = target.molecule_id

    reconcile_molecule!(source, target)
    target.reload if target.molecule_id != target_molecule_before

    reference_mw = molecular_weight(target) || molecular_weight(source)
    source_mol   = sample_mol(source, reference_mw)
    target_mol   = sample_mol(target, reference_mw)

    target.update!(real_amount_value: source_mol + target_mol, real_amount_unit: 'mol')
    rps_attributes = destroy_source_reaction_sample!(source, reaction)
    source.update!(is_legacy: true)

    SampleMerge.create!(
      source_sample: source,
      target_sample: target,
      reaction: reaction,
      source_amount_mol: source_mol,
      target_real_amount_value_before: snapshot[:value],
      target_real_amount_unit_before: snapshot[:unit],
      target_molecule_id_before: target_molecule_before,
      source_reaction_sample_attributes: rps_attributes,
    )
  end

  def apply_unmerge!(merge, source, target)
    is_last_merge = target.incoming_merges.where.not(id: merge.id).none?
    restore_or_subtract!(merge, target, is_last_merge)
    restore_target_molecule!(merge, target, is_last_merge)
    source.update!(is_legacy: false)
    restore_source_reaction_sample!(merge, source)
    merge.destroy!
  end

  def original_target_snapshot(target)
    { value: target.real_amount_value, unit: target.real_amount_unit }
  end

  def restore_or_subtract!(merge, target, is_last_merge)
    if is_last_merge
      target.update!(
        real_amount_value: merge.target_real_amount_value_before,
        real_amount_unit: merge.target_real_amount_unit_before,
      )
    else
      current_mol = sample_mol(target, molecular_weight(target))
      new_value   = current_mol - merge.source_amount_mol
      raise MergeError, 'unmerge would yield negative amount' if new_value.negative?

      target.update!(real_amount_value: new_value, real_amount_unit: 'mol')
    end
  end

  def reconcile_molecule!(source, target)
    return unless no_molecule?(target)
    return if no_molecule?(source)

    target.update!(molecule_id: source.molecule_id)
  end

  def restore_target_molecule!(merge, target, is_last_merge)
    return unless is_last_merge
    return if merge.target_molecule_id_before == target.molecule_id

    target.update!(molecule_id: merge.target_molecule_id_before)
  end

  def destroy_source_reaction_sample!(source, reaction)
    group = mergeable_group(reaction, source.id)
    return nil unless group

    scope = reaction.public_send(group).where(sample_id: source.id)
    raise MergeError, 'source has multiple reaction associations' if scope.many?

    rps = scope.first
    return nil unless rps

    attrs = rps.attributes.except('id', 'created_at', 'updated_at')
    rps.destroy!
    attrs
  end

  def restore_source_reaction_sample!(merge, source)
    return if merge.reaction.reactions_samples.exists?(sample_id: source.id)

    attrs = (merge.source_reaction_sample_attributes || {}).merge(
      'reaction_id' => merge.reaction_id,
      'sample_id' => source.id,
    )
    ReactionsSample.create!(attrs)
  end

  def validate_merge!(source, target, reaction)
    validate_distinct_samples!(source, target)
    validate_legacy_state!(source, target)
    validate_authorization!(source, target, reaction)
    validate_reaction_membership!(source, target, reaction)
    validate_molecule_compatibility!(source, target)
  end

  def validate_distinct_samples!(source, target)
    raise MergeError, 'source equals target' if source.id == target.id
  end

  def validate_legacy_state!(source, target)
    raise MergeError, 'source already merged' if source.is_legacy
    raise MergeError, 'target is legacy' if target.is_legacy
  end

  def validate_authorization!(source, target, reaction)
    authorized = can_update?(source) && can_update?(target) && can_update?(reaction)
    raise MergeError.new('Unauthorized', http_status: 401) unless authorized
  end

  def validate_reaction_membership!(source, target, reaction)
    source_group = mergeable_group(reaction, source.id)
    target_group = mergeable_group(reaction, target.id)
    raise MergeError, 'source must be a product or reactant of this reaction' unless source_group
    raise MergeError, 'target must be in the same material group as source' unless source_group == target_group
  end

  def mergeable_group(reaction, sample_id)
    MERGEABLE_GROUPS.find { |group| reaction.public_send(group).exists?(sample_id: sample_id) }
  end

  def validate_molecule_compatibility!(source, target)
    return if no_molecule?(source) || no_molecule?(target)
    return if source.molecule_inchikey == target.molecule_inchikey

    raise MergeError, 'source and target have different structures'
  end

  def no_molecule?(sample)
    key = sample.molecule_inchikey
    key.blank? || key == DUMMY_INCHIKEY
  end

  def molecular_weight(sample)
    mw = sample.molecule&.molecular_weight.to_f
    mw.positive? ? mw : nil
  end

  def sample_mol(sample, fallback_mw)
    return 0.0 if real_amount_blank?(sample)

    mol = sample.amount_mol
    return mol.to_f unless mol.nil?

    value = sample.real_amount_value.to_f
    unit  = sample.real_amount_unit
    return value if unit == 'mol'

    unless fallback_mw.to_f.positive? && unit == 'g'
      raise MergeError,
            "cannot convert sample #{sample.id} amount (#{unit.inspect}) to mol: " \
            'missing molecular weight or unsupported unit'
    end

    (value * sample.purity.to_f) / fallback_mw.to_f
  end

  def real_amount_blank?(sample)
    sample.real_amount_value.nil? || sample.real_amount_value.to_f.zero?
  end

  def can_update?(record)
    ElementPolicy.new(@user, record).update?
  end
end
