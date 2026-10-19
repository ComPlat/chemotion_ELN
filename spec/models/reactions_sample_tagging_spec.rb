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

      it 'adds the reaction id and resource to the mixture tag when linked' do
        expect(mixture.reload.tag.taggable_data.fetch('resources', [])).not_to include(reaction_resource)

        link

        expect(mixture.reload.tag.taggable_data['reaction_id']).to eq(reaction.id)
        expect(mixture.tag.taggable_data['resources']).to include(reaction_resource)
      end

      it 'removes the reaction resource from the mixture tag when unlinked' do
        link
        expect(mixture.reload.tag.taggable_data['resources']).to include(reaction_resource)

        link.destroy!

        expect(mixture.reload.tag.taggable_data.fetch('resources', [])).not_to include(reaction_resource)
      end

      it 'restores the reaction resource in the mixture tag when the link is restored' do
        link.destroy!
        expect(mixture.reload.tag.taggable_data.fetch('resources', [])).not_to include(reaction_resource)

        link.restore!

        expect(mixture.reload.tag.taggable_data['resources']).to include(reaction_resource)
      end
    end
  end
end
