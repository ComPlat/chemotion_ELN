# frozen_string_literal: true

# Soft-deletes stray duplicate JCAMP-derived attachments left over from before
# generate_att's dedup fix (see AttachmentJcampProcess#generate_att) started reusing the
# canonical row on every save/regenerate instead of minting a new one. Groups live
# Container-attached rows by (attachable_id, filename, ancestry root) - the same identity
# generate_att itself uses - and keeps only the highest-id row per group, matching what
# generate_att would already resolve to going forward. Rows in different lineages that
# happen to share a filename by coincidence (see B2 in the PR's own review history) are
# left alone, since they are not duplicates of each other.
module CleanupDuplicateDerivedAttachmentsTask
  Result = Struct.new(:attachable_id, :filename, :kept_id, :removed_ids)

  def self.execute!(dry_run: true)
    results = duplicate_groups.flat_map { |group| resolve_group(group) }

    results.each do |result|
      Attachment.where(id: result.removed_ids).find_each(&:destroy) unless dry_run
      log(result, dry_run)
    end

    results
  end

  # (attachable_id, filename) pairs with more than one live Container-attached row,
  # each loaded as the full candidate list for that pair.
  def self.duplicate_groups
    candidate_keys = Attachment.where(attachable_type: 'Container')
                               .where.not(attachable_id: nil)
                               .group(:attachable_id, :filename)
                               .having('COUNT(*) > 1')
                               .count
                               .keys

    candidate_keys.map do |attachable_id, filename|
      Attachment.where(attachable_type: 'Container', attachable_id: attachable_id, filename: filename)
                .order(:id)
                .to_a
    end
  end

  # Splits a same-filename candidate list by ancestry root - only rows sharing both
  # filename and lineage are true duplicates of one logical curve.
  def self.resolve_group(candidates)
    candidates.group_by { |att| att.root_id || att.id }.values.filter_map do |lineage_group|
      next if lineage_group.size <= 1

      kept = lineage_group.max_by(&:id)
      removed = lineage_group - [kept]
      Result.new(kept.attachable_id, kept.filename, kept.id, removed.map(&:id))
    end
  end

  def self.log(result, dry_run)
    verb = dry_run ? 'would remove' : 'removed'
    Rails.logger.info(
      "[CleanupDuplicateDerivedAttachmentsTask] attachable_id=#{result.attachable_id} " \
      "filename=#{result.filename.inspect} keeping ##{result.kept_id}, #{verb} #{result.removed_ids.join(', ')}",
    )
  end
end
