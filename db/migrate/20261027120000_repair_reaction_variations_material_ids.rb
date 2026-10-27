# frozen_string_literal: true

# Repairs reaction variations whose material keys aren't among the reaction's own samples
# (see Usecases::Reactions::UpdateVariations), which crash the Variations tab:
# - keys of materials that were removed while the Variations tab was not mounted are dropped;
# - copies persisted by a failed create, still keyed by the source reaction's samples, are remapped.
#
# Idempotent: reactions whose keys all match their own materials are left untouched.
class RepairReactionVariationsMaterialIds < ActiveRecord::Migration[6.1]
  def up
    repaired = 0
    Reaction.where("variations IS NOT NULL AND variations NOT IN ('[]'::jsonb, '{}'::jsonb)").find_each do |reaction|
      variations = Usecases::Reactions::UpdateVariations.new(reaction).execute!
      next if variations == reaction.variations

      # Keep the storage format: the jsonb column holds either a hash keyed by uuid or a legacy array.
      variations = variations.index_by { |variation| variation['uuid'] } if reaction[:variations].is_a?(Hash)
      reaction.update_column(:variations, variations) # rubocop:disable Rails/SkipsModelValidations
      repaired += 1
    end
    say "repaired the variations of #{repaired} reaction(s)"
  end

  # Nothing to undo: the dropped keys could not be displayed anyway.
  def down; end
end
