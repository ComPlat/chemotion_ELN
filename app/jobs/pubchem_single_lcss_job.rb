# frozen_string_literal: true

# Job to update molecule info for molecules with no LCSS
# associated LCSS (molecule tag) is updated if cid found in PC db
class PubchemSingleLcssJob < ApplicationJob
  include PubchemRateLimitGuard

  queue_as :single_pubchem_lcss

  # NB: PC has request restriction policy, hence the sleep — matches the
  # spacing already used by the sibling cron batch job, PubchemLcssJob.
  SLEEP_BETWEEN_REQUESTS = 0.5

  # @param ids [Array<Integer>, nil] molecule ids (default) or sample ids (see +type+)
  # @param type [Symbol] +:molecules+ (default) or +:samples+ — when +:samples+, +ids+
  #   is resolved to the distinct molecule ids referenced by those samples first
  # @param created_after [ActiveSupport::TimeWithZone, nil] only include molecules
  #   created after this time; combines with +ids+ (or its resolved molecule ids) as
  #   an intersection (AND), narrowing rather than extending the set
  def perform(ids = nil, type: :molecules, created_after: nil)
    # TODO: > stub request for testing
    return if Rails.env.test?
    return if ids.blank? && created_after.blank?

    if other_pubchem_job_running?
      self.class.set(wait: PubchemRateLimitGuard::REQUEUE_DELAY)
          .perform_later(ids, type: type, created_after: created_after)
      return
    end

    resolve_molecules(ids, type: type, created_after: created_after)
      .each_with_index do |molecule, i|
        sleep SLEEP_BETWEEN_REQUESTS if i.positive?
        molecule.pubchem_lcss
      end
  end

  private

  # @return [ActiveRecord::Relation<Molecule>] molecules still missing LCSS data, ordered
  #   by id, with +:tag+ eager loaded (single query, also used to filter out molecules
  #   a competing job already finished — e.g. during this job's own requeue delay)
  def resolve_molecules(ids, type:, created_after:)
    if ids.present? && type.to_sym == :samples
      ids = Sample.where(id: ids).where.not(molecule_id: nil).distinct.pluck(:molecule_id)
    end

    scope = Molecule.eager_load(:tag)
                    .where("element_tags.taggable_data->>'pubchem_lcss' is null")
                    .order(:id)
    scope = scope.where(id: ids) if ids.present?
    scope = scope.where('molecules.created_at > ?', created_after) if created_after.present?
    scope
  end
end
