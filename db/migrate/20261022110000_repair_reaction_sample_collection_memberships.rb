# frozen_string_literal: true

# Adds each reaction's samples to the collections that hold the reaction (see
# RepairReactionSampleCollectionsTask). Without the membership, exporting such a collection writes a
# reaction that references a sample missing from the archive, and the archive cannot be imported.
# Running it as a migration makes the repair part of every upgrade.
#
# Pairs whose sample belongs to another user are left alone and only reported: adding them would
# give the collection's users access to that sample. `rake collections:repair_reaction_samples`
# lists them.
#
# Idempotent: a second run finds no missing pair it may repair.
class RepairReactionSampleCollectionMemberships < ActiveRecord::Migration[6.1]
  def up
    results = RepairReactionSampleCollectionsTask.execute!(dry_run: false)
    counts = results.group_by(&:action).transform_values(&:size)
    say "added #{counts.fetch(:added, 0)}, revived #{counts.fetch(:revived, 0)} reaction sample " \
        "membership(s); #{counts.fetch(:cross_owner, 0)} cross-owner pair(s) left, " \
        'see rake collections:repair_reaction_samples'
  end

  def down
    # Irreversible: a repaired membership is indistinguishable from one created by the application.
    say 'RepairReactionSampleCollectionMemberships is not reversible (membership rows cannot be safely removed).'
  end
end
