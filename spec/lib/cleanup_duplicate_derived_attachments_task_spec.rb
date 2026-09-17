# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'CleanupDuplicateDerivedAttachmentsTask' do
  let(:root) { create(:attachment, filename: 'spectra_file.jdx', aasm_state: 'edited') }
  let!(:older_duplicate) do
    create(
      :attachment, filename: 'spectra_file.edit.jdx', attachable: root.attachable,
                   aasm_state: 'edited', parent: root
    )
  end
  let!(:newer_duplicate) do
    create(
      :attachment, filename: 'spectra_file.edit.jdx', attachable: root.attachable,
                   aasm_state: 'edited', parent: root
    )
  end

  describe '.duplicate_groups' do
    it 'finds the (attachable_id, filename) pair with more than one live row' do
      groups = CleanupDuplicateDerivedAttachmentsTask.duplicate_groups

      matching_group = groups.find { |g| g.map(&:id).sort == [older_duplicate.id, newer_duplicate.id].sort }
      expect(matching_group).not_to be_nil
    end
  end

  describe '.execute!' do
    context 'with dry_run: true (default)' do
      it 'does not delete anything' do
        expect { CleanupDuplicateDerivedAttachmentsTask.execute!(dry_run: true) }
          .not_to change(Attachment, :count)
      end

      it 'reports the group it would clean up' do
        results = CleanupDuplicateDerivedAttachmentsTask.execute!(dry_run: true)
        result = results.find { |r| r.kept_id == newer_duplicate.id }

        expect(result).not_to be_nil
        expect(result.removed_ids).to eq([older_duplicate.id])
      end
    end

    context 'with dry_run: false' do
      it 'soft-deletes every row but the highest-id one in the same lineage' do
        CleanupDuplicateDerivedAttachmentsTask.execute!(dry_run: false)

        expect(Attachment.exists?(older_duplicate.id)).to be false
        expect(Attachment.exists?(newer_duplicate.id)).to be true
      end
    end

    context 'when the same filename is shared by an unrelated lineage' do
      let!(:unrelated_source) do
        create(:attachment, filename: 'other_curve.jdx', attachable: root.attachable, aasm_state: 'peaked')
      end
      let!(:unrelated_edit) do
        create(
          :attachment, filename: 'spectra_file.edit.jdx', attachable: root.attachable,
                       aasm_state: 'edited', parent: unrelated_source
        )
      end

      it "leaves the unrelated lineage's row alone" do
        CleanupDuplicateDerivedAttachmentsTask.execute!(dry_run: false)

        expect(Attachment.exists?(unrelated_edit.id)).to be true
      end
    end

    context 'when attachable_type is not Container' do
      let!(:research_plan_duplicate) do
        create(:attachment, :attached_to_research_plan, filename: 'unrelated.jdx', aasm_state: 'edited')
      end
      let!(:research_plan_duplicate2) do
        create(
          :attachment, :attached_to_research_plan, filename: 'unrelated.jdx', aasm_state: 'edited',
                                                   attachable: research_plan_duplicate.attachable
        )
      end

      it 'is ignored' do
        expect { CleanupDuplicateDerivedAttachmentsTask.execute!(dry_run: false) }
          .not_to(change { Attachment.exists?(research_plan_duplicate2.id) })
      end
    end
  end
end
