# frozen_string_literal: true

require 'rails_helper'
RSpec.describe Usecases::Search::AllElementsSearch do
  include_context 'api request authorization context'

  describe '#search_by_substring' do
    let(:user) { create(:user) }
    let(:collection) { create(:collection, user: user) }
    let(:sample) { create(:sample, name: 'testtest', collections: [collection]) }
    let(:sample2) { create(:sample, name: 'test-1', collections: [collection]) }
    let(:sbmm_sample_uniprot) do
      create(
        :sequence_based_macromolecule_sample,
        sequence_based_macromolecule: build(:uniprot_sbmm, systematic_name: 'Zoological Phenomenon'),
        user: user,
        name: 'Test sample',
      )
    end
    let(:sbmm_sample_modified) do
      create(
        :sequence_based_macromolecule_sample,
        sequence_based_macromolecule: build(
          :modified_uniprot_sbmm,
          systematic_name: 'Foobar testtest',
          ec_numbers: ['2.6.1.1'],
          parent: sbmm_sample_uniprot.sequence_based_macromolecule,
        ),
        user: user,
      )
    end

    def search(term)
      described_class.new(term: term, collection_id: collection.id, user: user).search_by_substring
    end

    before do
      sample
      sample2
      sbmm_sample_uniprot
      sbmm_sample_modified
      CollectionsSequenceBasedMacromoleculeSample.create!(sequence_based_macromolecule_sample: sbmm_sample_uniprot,
                                                          collection: collection)
      CollectionsSequenceBasedMacromoleculeSample.create!(sequence_based_macromolecule_sample: sbmm_sample_modified,
                                                          collection: collection)
      PgSearch::Multisearch.rebuild(Sample)
    end

    it 'searches all elements for given substring' do
      search_results = search('test').results

      expect(PgSearch::Document.count).to eq 6
      expect(search_results.count).to eq 4
      expect(search_results.map(&:searchable_type).uniq).to include('SequenceBasedMacromoleculeSample', 'Sample',
                                                                    'SequenceBasedMacromolecule')
    end
  end
end
