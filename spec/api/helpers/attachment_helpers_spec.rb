# frozen_string_literal: true

require 'rails_helper'

# Unit coverage of #write_access?, the attachment write rule: AttachmentAPI#writable? and the
# third-party-app API delegate to it, so it decides who may delete, annotate or regenerate an
# attachment. Deliberately unstubbed - ElementPolicy runs against real collections and shares.
RSpec.describe AttachmentHelpers do
  subject(:write_access) { write_access_for?(user) }

  let(:user) { create(:person) }
  let(:owner) { create(:person) }
  let(:own_collection) { create(:collection, user: user) }
  let(:owners_collection) { create(:collection, user: owner) }
  let(:permission_level) { CollectionShare.permission_level(:edit_elements) }
  let(:detail_level) { 10 }
  let(:shared_collection) do
    create(:collection, user: owner).tap do |collection|
      create(:collection_share, collection: collection, shared_with: user, permission_level: permission_level,
                                researchplan_detail_level: detail_level,
                                sequencebasedmacromoleculesample_detail_level: detail_level)
    end
  end

  # Inbox files have attachable_type 'Container' but no attachable_id, so there is no root element
  # and write_access? denies. AttachmentAPI#writable? grants their created_for user separately.
  context 'with an unsorted inbox attachment' do
    let(:attachment) { create(:attachment, attachable: nil, attachable_type: 'Container', created_for: user.id) }

    it { is_expected.to be false }
  end

  context 'with an attachment in a container rooted at the user' do
    let(:attachment) { create(:attachment, attachable: create(:container, containable: user)) }

    it { is_expected.to be true }

    it 'denies another user' do
      expect(write_access_for?(owner)).to be false
    end
  end

  context 'with an attachment in the analysis container of a sample in an own collection' do
    let(:sample) { create(:sample, collections: [own_collection]) }
    let(:attachment) { create(:attachment, attachable: create(:container, containable: sample)) }

    it { is_expected.to be true }
  end

  describe 'with an attachment linked directly to a research plan' do
    let(:attachment) { create(:attachment, attachable: research_plan, created_for: owner.id) }

    context 'when the research plan is in an own collection' do
      let(:research_plan) { create(:research_plan, collections: [own_collection]) }

      it { is_expected.to be true }
    end

    context 'when shared with edit rights and full detail' do
      let(:research_plan) { create(:research_plan, creator: owner, collections: [shared_collection]) }

      it { is_expected.to be true }
    end

    context 'when shared read-only' do
      let(:permission_level) { CollectionShare.permission_level(:read_elements) }
      let(:research_plan) { create(:research_plan, creator: owner, collections: [shared_collection]) }

      it { is_expected.to be false }
    end

    context 'when shared with edit rights below full detail' do
      let(:detail_level) { 9 }
      let(:research_plan) { create(:research_plan, creator: owner, collections: [shared_collection]) }

      it { is_expected.to be false }
    end

    context 'when not shared with the user' do
      let(:research_plan) { create(:research_plan, creator: owner, collections: [owners_collection]) }

      it { is_expected.to be false }
    end
  end

  # An SBMM is collected through its samples and shared at their detail level
  # (sequencebasedmacromoleculesample_detail_level); there is no column of its own.
  describe 'with an attachment linked directly to an SBMM' do
    let(:sbmm) { create(:uniprot_sbmm) }
    let(:attachment) { create(:attachment, attachable: sbmm, created_for: owner.id) }

    before do
      create(:sequence_based_macromolecule_sample, sequence_based_macromolecule: sbmm, user: owner,
                                                   collections: [sample_collection])
    end

    context 'when its sample is shared with edit rights and full detail' do
      let(:sample_collection) { shared_collection }

      it { is_expected.to be true }
    end

    context 'when its sample is shared read-only' do
      let(:permission_level) { CollectionShare.permission_level(:read_elements) }
      let(:sample_collection) { shared_collection }

      it { is_expected.to be false }
    end

    context 'when its sample is not shared with the user' do
      let(:sample_collection) { owners_collection }

      it { is_expected.to be false }
    end
  end

  def write_access_for?(accessing_user)
    Class.new { include AttachmentHelpers }.new.write_access?(attachment, accessing_user)
  end
end
