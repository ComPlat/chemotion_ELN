# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ReactionsSample, type: :model do
  let(:mixture) { create(:sample, sample_type: Sample::SAMPLE_TYPE_MIXTURE) }
  let(:reaction) { create(:reaction, creator: mixture.creator) }
  let(:reaction_resource) do
    {
      'resource_context_type' => 'Reaction',
      'resource_context_id' => reaction.id,
      'resource_context_label' => reaction.short_label,
    }
  end

  [ReactionsSolventSample, ReactionsPurificationSolventSample].each do |association_class|
    context "when a mixture is linked through #{association_class.name}" do
      let(:link) { association_class.create!(sample: mixture, reaction: reaction) }

      it 'adds the reaction resource without assigning a reaction badge when linked' do
        expect(mixture.reload.tag.taggable_data.fetch('resources', [])).not_to include(reaction_resource)

        link

        expect(mixture.reload.tag.taggable_data['reaction_id']).to be_nil
        expect(mixture.tag.taggable_data['resources']).to include(reaction_resource)
      end

      it 'removes the reaction resource from the mixture tag when unlinked' do
        link
        expect(mixture.reload.tag.taggable_data['resources']).to include(reaction_resource)

        link.destroy!

        expect(mixture.reload.tag.taggable_data.fetch('resources', [])).not_to include(reaction_resource)
        expect(mixture.tag.taggable_data['reaction_id']).to be_nil
      end

      it 'restores the reaction resource in the mixture tag when the link is restored' do
        link.destroy!
        expect(mixture.reload.tag.taggable_data.fetch('resources', [])).not_to include(reaction_resource)

        link.restore!

        expect(mixture.reload.tag.taggable_data['resources']).to include(reaction_resource)
        expect(mixture.tag.taggable_data['reaction_id']).to be_nil
      end

      it 'keeps the product reaction badge through a solvent link lifecycle' do
        source_reaction = create(:reaction, creator: mixture.creator)
        ReactionsProductSample.create!(sample: mixture, reaction: source_reaction)

        link
        expect(mixture.reload.tag.taggable_data['reaction_id']).to eq(source_reaction.id)
        link.destroy!
        expect(mixture.reload.tag.taggable_data['reaction_id']).to eq(source_reaction.id)
        link.restore!
        expect(mixture.reload.tag.taggable_data['reaction_id']).to eq(source_reaction.id)
      end

      it 'keeps a shared solvent unbadged while retaining its remaining reaction resource' do
        solvent = create(:sample)
        other_reaction = create(:reaction, creator: solvent.creator)
        first_link = association_class.create!(sample: solvent, reaction: reaction)
        association_class.create!(sample: solvent, reaction: other_reaction)
        expect(solvent.reload.tag.taggable_data['reaction_id']).to be_nil

        first_link.destroy!

        resources = solvent.reload.tag.taggable_data.fetch('resources', [])
        expect(resources.pluck('resource_context_id')).to eq([other_reaction.id])
        expect(solvent.tag.taggable_data['reaction_id']).to be_nil
      end
    end
  end
end
