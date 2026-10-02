# frozen_string_literal: true

require 'rails_helper'

# The shared attachment access rule. Deliberately unstubbed: ElementPolicy runs against real
# collections and shares.
RSpec.describe Usecases::Attachments::Access do
  let(:user) { create(:person) }
  let(:owner) { create(:person) }
  let(:own_collection) { create(:collection, user: user) }
  let(:owners_collection) { create(:collection, user: owner) }
  let(:permission_level) { CollectionShare.permission_level(:edit_elements) }
  let(:detail_level) { 10 }
  let(:shared_collection) do
    create(:collection, user: owner).tap do |collection|
      create(:collection_share, collection: collection, shared_with: user, permission_level: permission_level,
                                researchplan_detail_level: detail_level, sample_detail_level: detail_level,
                                sequencebasedmacromoleculesample_detail_level: detail_level)
    end
  end

  def read?(attachment, as: user)
    described_class.new(as).read?(attachment)
  end

  def write?(attachment, as: user)
    described_class.new(as).write?(attachment)
  end

  it 'denies a missing attachment or user' do
    attachment = create(:attachment, attachable: create(:container, containable: user))
    expect([read?(nil), write?(nil), described_class.new(nil).read?(attachment)]).to all(be false)
  end

  # Unsorted inbox files: attachable_type 'Container', no attachable_id.
  context 'with an unsorted inbox attachment' do
    let(:attachment) { create(:attachment, attachable: nil, attachable_type: 'Container', created_for: user.id) }

    it 'lets the user it was created for read and change it' do
      expect([read?(attachment), write?(attachment)]).to all(be true)
    end

    it 'denies anyone else' do
      expect([read?(attachment, as: owner), write?(attachment, as: owner)]).to all(be false)
    end
  end

  context 'with an attachment whose element was deleted' do
    let(:sample) { create(:sample, collections: [own_collection]) }
    let(:attachment) do
      create(:attachment, attachable: create(:container, containable: sample), created_for: user.id)
    end

    before { sample.destroy }

    it 'does not fall back to the uploader' do
      expect([read?(attachment.reload), write?(attachment)]).to all(be false)
    end
  end

  # Device-box inbox: the root container's containable is the user.
  context 'with an attachment in a container rooted at a user' do
    let(:attachment) { create(:attachment, attachable: create(:container, containable: user)) }

    it 'lets that user read and change it' do
      expect([read?(attachment), write?(attachment)]).to all(be true)
    end

    it 'denies another user without raising' do
      expect([read?(attachment, as: owner), write?(attachment, as: owner)]).to all(be false)
    end
  end

  context 'with an attachment in the analysis container of a sample' do
    let(:attachment) { create(:attachment, attachable: create(:container, containable: sample)) }

    context 'when the sample is in an own collection' do
      let(:sample) { create(:sample, collections: [own_collection]) }

      it { expect([read?(attachment), write?(attachment)]).to all(be true) }
    end

    context 'when the sample is shared read-only' do
      let(:permission_level) { CollectionShare.permission_level(:read_elements) }
      let(:sample) { create(:sample, creator: owner, collections: [shared_collection]) }

      it 'allows reading only' do
        expect([read?(attachment), write?(attachment)]).to eq [true, false]
      end
    end

    context 'when the sample is not shared with the user' do
      let(:sample) { create(:sample, creator: owner, collections: [owners_collection]) }

      it { expect([read?(attachment), write?(attachment)]).to all(be false) }
    end
  end

  describe 'with an attachment linked directly to a research plan' do
    let(:attachment) { create(:attachment, attachable: research_plan, created_for: owner.id) }

    context 'when the research plan is in an own collection' do
      let(:research_plan) { create(:research_plan, collections: [own_collection]) }

      it { expect([read?(attachment), write?(attachment)]).to all(be true) }
    end

    context 'when shared with edit rights and full detail' do
      let(:research_plan) { create(:research_plan, creator: owner, collections: [shared_collection]) }

      it { expect([read?(attachment), write?(attachment)]).to all(be true) }
    end

    context 'when shared read-only' do
      let(:permission_level) { CollectionShare.permission_level(:read_elements) }
      let(:research_plan) { create(:research_plan, creator: owner, collections: [shared_collection]) }

      it { expect([read?(attachment), write?(attachment)]).to eq [true, false] }
    end

    context 'when shared with edit rights below full detail' do
      let(:detail_level) { 9 }
      let(:research_plan) { create(:research_plan, creator: owner, collections: [shared_collection]) }

      it { expect(write?(attachment)).to be false }
    end

    context 'when not shared with the user' do
      let(:research_plan) { create(:research_plan, creator: owner, collections: [owners_collection]) }

      it { expect([read?(attachment), write?(attachment)]).to all(be false) }
    end
  end

  # An SBMM is collected through its samples and shared at their detail level. Once a user other
  # than the acting one has a sample of it, only the uploader may change an attachment on it.
  describe 'with an attachment linked directly to an SBMM' do
    let(:sbmm) { create(:uniprot_sbmm) }
    let(:owners_attachment) { create(:attachment, attachable: sbmm, created_for: owner.id) }
    let(:users_attachment) { create(:attachment, attachable: sbmm, created_for: user.id) }

    context 'when only the acting user has samples of it' do
      before do
        create(:sequence_based_macromolecule_sample, sequence_based_macromolecule: sbmm, user: user,
                                                     collections: [own_collection])
      end

      it 'lets them change any attachment on it' do
        expect([write?(owners_attachment), write?(users_attachment)]).to all(be true)
      end
    end

    context 'when another user also has a sample of it' do
      before do
        create(:sequence_based_macromolecule_sample, sequence_based_macromolecule: sbmm, user: user,
                                                     collections: [own_collection])
        create(:sequence_based_macromolecule_sample, sequence_based_macromolecule: sbmm, user: owner,
                                                     collections: [owners_collection])
      end

      it 'lets each user change only their own uploads' do
        expect([write?(users_attachment), write?(owners_attachment)]).to eq [true, false]
        expect(write?(owners_attachment, as: owner)).to be true
      end

      it 'still lets them read every attachment on it' do
        expect([read?(users_attachment), read?(owners_attachment)]).to all(be true)
      end
    end

    context "when the user reaches it through a share of another user's sample" do
      before do
        create(:sequence_based_macromolecule_sample, sequence_based_macromolecule: sbmm, user: owner,
                                                     collections: [shared_collection])
      end

      it 'allows reading, and changing only their own uploads' do
        expect([read?(owners_attachment), write?(owners_attachment), write?(users_attachment)])
          .to eq [true, false, true]
      end
    end

    context 'when its sample is not shared with the user' do
      before do
        create(:sequence_based_macromolecule_sample, sequence_based_macromolecule: sbmm, user: owner,
                                                     collections: [owners_collection])
      end

      it { expect([read?(owners_attachment), write?(owners_attachment)]).to all(be false) }
    end
  end

  it 'runs the element policy once per root element' do
    sample = create(:sample, collections: [own_collection])
    container = create(:container, containable: sample)
    attachments = create_list(:attachment, 3, attachable: container)
    allow(ElementPolicy).to receive(:new).and_call_original

    access = described_class.new(user)
    expect(attachments.map { |a| access.write?(a) }).to all(be true)
    expect(ElementPolicy).to have_received(:new).once
  end
end
