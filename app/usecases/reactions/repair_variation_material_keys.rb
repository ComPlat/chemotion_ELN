# frozen_string_literal: true

# Repairs stored variations whose material keys aren't among the reaction's own materials, which the
# Variations tab can't display (see {ReactionVariationMaterialKeys}):
# - copies still keyed by the source reaction's samples are remapped by group position (via +origin+);
# - keys of materials removed while the Variations tab was not mounted are dropped.
#
# Run through +rake reactions:repair_variation_keys+ (dry run by default). Every remapped reaction and
# every dropped key is reported through the given logger.
#
# Side effects when applied:
# - the column is written with +update_column+, so callbacks don't run and +updated_at+ is kept;
# - the logidze trigger still records a version (without author) per repaired reaction. Reverting that
#   version from the History tab restores the old keys; they are dropped again by the next save that
#   changes the reaction's materials, and the Variations tab hides them meanwhile;
# - soft-deleted reactions are skipped (their samples are usually soft-deleted too, so every key would
#   look orphaned).
module Usecases
  module Reactions
    class RepairVariationMaterialKeys
      Result = Struct.new(:checked, :repaired, :failed, keyword_init: true)

      # @param apply [Boolean] write the repaired variations; +false+ only reports
      # @param logger [#info, #warn]
      def initialize(apply: false, logger: Rails.logger)
        @apply = apply
        @logger = logger
      end

      # @return [Result] counts; +repaired+ counts reactions that changed (or would change)
      def execute!
        result = Result.new(checked: 0, repaired: [], failed: [])
        scope.find_each do |reaction|
          result.checked += 1
          repair(reaction, result)
        rescue StandardError => e
          result.failed << reaction.id
          @logger.warn("Reaction #{reaction.id}: variations not repaired (#{e.class}: #{e.message})")
        end
        result
      end

      private

      def scope
        Reaction.where("variations IS NOT NULL AND variations NOT IN ('[]'::jsonb, '{}'::jsonb)")
      end

      def repair(reaction, result)
        reconciled = reaction.reconcile_variation_material_keys(
          origin_reaction: Reaction.with_deleted.find_by(id: reaction.origin&.dig('id')),
          on_drop: ->(group, key, entry) { log_drop(reaction, group, key, entry) },
        )
        return if reconciled == reaction.variations

        result.repaired << reaction.id
        @logger.info("Reaction #{reaction.id}: #{@apply ? 'repaired' : 'would repair'} variations material keys")
        return unless @apply

        reaction.variations = reconciled
        reaction.send(:transform_variations) # keep the stored format: a hash keyed by variation uuid
        reaction.update_column(:variations, reaction[:variations]) # rubocop:disable Rails/SkipsModelValidations
      end

      def log_drop(reaction, group, key, entry)
        @logger.info(
          "Reaction #{reaction.id}: #{@apply ? 'drops' : 'would drop'} #{group} key #{key} " \
          "(#{entry.to_json.truncate(200)})",
        )
      end
    end
  end
end
