# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Usecases::Search::AllElementsSearch do
  subject(:results) do
    described_class.new(term: 'Expansionneedle', collection_id: collection.id, user: nil).search_by_substring
  end

  let(:user) { create(:person) }
  let(:collection) { create(:collection, user: user) }
  let(:other_owner) { create(:person) }
  let(:other_collection) { create(:collection, user: other_owner) }

  shared_examples 'collection-scoped material expansion' do
    before do
      matching_sample
      other_sample
    end

    it 'returns only samples in the searched collection' do
      expect(results.public_send(ids_method)).to contain_exactly(matching_sample.id)
    end

    context 'when the other collection belongs to the same user' do
      let(:other_owner) { user }

      it 'still returns only samples in the searched collection' do
        expect(results.public_send(ids_method)).to contain_exactly(matching_sample.id)
      end
    end

    context 'when the sample and material ids differ' do
      let(:matching_sample_id) { material.id + 10_000 }

      it 'matches the material through its sample in the searched collection' do
        expect(results.results.where(searchable_type: material.class.name).pluck(:searchable_id))
          .to contain_exactly(material.id)
        expect(results.public_send(ids_method)).to contain_exactly(matching_sample.id)
      end
    end
  end

  context 'when a macromolecule matches' do
    let(:material) { create(:uniprot_sbmm, id: 10_000, systematic_name: 'Expansionneedle') }
    let(:matching_sample_id) { material.id }
    let(:matching_sample) do
      create(:sequence_based_macromolecule_sample, id: matching_sample_id, sequence_based_macromolecule: material,
                                                   user: user, collections: [collection])
    end
    let(:other_sample) do
      create(:sequence_based_macromolecule_sample, sequence_based_macromolecule: material,
                                                   user: other_owner, collections: [other_collection])
    end
    let(:ids_method) { :sequence_based_macromolecule_sample_ids }

    it_behaves_like 'collection-scoped material expansion'

    it 'does not match a macromolecule through an unrelated sample with the same id' do
      other_sample
      unrelated = create(:uniprot_sbmm, systematic_name: 'Unrelated protein', primary_accession: 'Q99999')
      create(:sequence_based_macromolecule_sample, id: material.id, sequence_based_macromolecule: unrelated,
                                                   user: user, collections: [collection])

      expect(results.results.where(searchable_type: 'SequenceBasedMacromolecule')).to be_empty
      expect(results.sequence_based_macromolecule_sample_ids).not_to include(other_sample.id)
    end

    it 'does not include macromolecules when their sample type is absent from the user layout' do
      matching_sample
      user.profile.update!(data: { 'layout' => { 'sample' => 1 } })

      search = described_class.new(term: 'Expansionneedle', collection_id: collection.id, user: user)
      expect(search.search_by_substring.results).to be_empty
    end
  end

  context 'when a cell-line material matches' do
    let(:material) { create(:cellline_material, id: 10_000, name: 'Expansionneedle') }
    let(:matching_sample_id) { material.id }
    let(:matching_sample) do
      create(:cellline_sample, id: matching_sample_id, cellline_material: material, creator: user,
                               collections: [collection])
    end
    let(:other_sample) do
      create(:cellline_sample, cellline_material: material, creator: other_owner, collections: [other_collection])
    end
    let(:ids_method) { :cell_line_ids }

    it_behaves_like 'collection-scoped material expansion'

    it 'does not match a material through an unrelated sample with the same id' do
      other_sample
      unrelated = create(:cellline_material, name: 'Unrelated material')
      create(:cellline_sample, id: material.id, cellline_material: unrelated, creator: user, collections: [collection])

      expect(results.results.where(searchable_type: 'CelllineMaterial')).to be_empty
      expect(results.cell_line_ids).not_to include(other_sample.id)
    end

    it 'does not include materials when their sample type is absent from the user layout' do
      matching_sample
      user.profile.update!(data: { 'layout' => { 'sample' => 1 } })

      search = described_class.new(term: 'Expansionneedle', collection_id: collection.id, user: user)
      expect(search.search_by_substring.results).to be_empty
    end
  end
end
