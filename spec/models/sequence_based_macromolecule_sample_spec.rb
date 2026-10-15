# frozen_string_literal: true

# == Schema Information
#
# Table name: sequence_based_macromolecule_samples
#
#  id                              :bigint           not null, primary key
#  activity_per_mass_unit          :string           default("U/g"), not null
#  activity_per_mass_value         :float
#  activity_per_volume_unit        :string           default("U/L"), not null
#  activity_per_volume_value       :float
#  activity_unit                   :string           default("U"), not null
#  activity_value                  :float
#  amount_as_used_mass_unit        :string           default("g"), not null
#  amount_as_used_mass_value       :float
#  amount_as_used_mol_unit         :string           default("mol"), not null
#  amount_as_used_mol_value        :float
#  ancestry                        :string           default("/"), not null
#  concentration_rt_unit           :string           default("mol/L"), not null
#  concentration_rt_value          :float
#  concentration_unit              :string           default("ng/L"), not null
#  concentration_value             :float
#  deleted_at                      :datetime
#  external_label                  :string
#  formulation                     :string           default("")
#  function_or_application         :string
#  heterologous_expression         :string           default("unknown"), not null
#  inventory_sample                :boolean          default(FALSE), not null
#  localisation                    :string           default("")
#  molarity_unit                   :string           default("mol/L"), not null
#  molarity_value                  :float
#  name                            :string           not null
#  obtained_by                     :string           default("")
#  organism                        :string           default("")
#  purification_method             :string           default("")
#  purity                          :float
#  purity_detection                :string           default("")
#  short_label                     :string           not null
#  strain                          :string           default("")
#  supplier                        :string           default("")
#  tissue                          :string           default("")
#  volume_as_used_unit             :string           default("L"), not null
#  volume_as_used_value            :float
#  created_at                      :datetime         not null
#  updated_at                      :datetime         not null
#  sequence_based_macromolecule_id :bigint
#  taxon_id                        :string           default("")
#  user_id                         :bigint
#
# Indexes
#
#  idx_sbmm_samples_ancestry          (ancestry)
#  idx_sbmm_samples_deleted_at        (deleted_at)
#  idx_sbmm_samples_inventory_sample  (inventory_sample)
#  idx_sbmm_samples_sbmm              (sequence_based_macromolecule_id)
#  idx_sbmm_samples_user              (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (sequence_based_macromolecule_id => sequence_based_macromolecules.id)
#  fk_rails_...  (user_id => users.id)
#
require 'rails_helper'

RSpec.describe SequenceBasedMacromoleculeSample do
  let(:user) { create(:person) }
  let(:other_user) { create(:person) }
  let(:sbmm) { create(:uniprot_sbmm) }
  let(:sbmm_sample) { create(:sequence_based_macromolecule_sample, sequence_based_macromolecule: sbmm, user: user) }

  def create_sbmm_sample(**attributes)
    create(:sequence_based_macromolecule_sample, sequence_based_macromolecule: sbmm, user: user, **attributes)
  end

  describe 'soft delete' do
    it 'only sets deleted_at on destroy' do
      sbmm_sample.destroy

      expect(described_class.with_deleted.find(sbmm_sample.id).deleted_at).to be_present
      expect(described_class.find_by(id: sbmm_sample.id)).to be_nil
    end
  end

  describe 'associations' do
    it { is_expected.to belong_to(:sequence_based_macromolecule) }
    it { is_expected.to belong_to(:user) }
    it { is_expected.to have_one(:container).dependent(:nullify) }
    it { is_expected.to have_one(:chemical).dependent(:destroy) }
    it { is_expected.to have_many(:attachments).dependent(:nullify) }
    it { is_expected.to have_many(:comments).dependent(:destroy) }
    it { is_expected.to have_many(:collections).through(:collections_sequence_based_macromolecule_samples) }
    it { is_expected.to have_many(:reactions).through(:reactions_reactant_sbmm_samples) }
  end

  describe 'scopes' do
    describe '.created_by / .not_created_by' do
      let!(:own_sample) { create_sbmm_sample }
      let!(:foreign_sample) { create_sbmm_sample(user: other_user) }

      it 'selects the samples of the given user' do
        expect(described_class.created_by(user.id)).to contain_exactly(own_sample)
      end

      it 'selects the samples of all other users' do
        expect(described_class.not_created_by(user.id)).to contain_exactly(foreign_sample)
      end
    end

    describe '.includes_for_list_display' do
      it 'preloads the macromolecule and the comments' do
        create_sbmm_sample
        record = described_class.includes_for_list_display.first

        expect(record.association(:sequence_based_macromolecule)).to be_loaded
        expect(record.association(:comments)).to be_loaded
      end
    end

    describe '.in_sbmm_order' do
      it 'orders by most recent update first' do
        older = create_sbmm_sample(updated_at: 2.days.ago)
        newer = create_sbmm_sample(updated_at: 1.day.ago)

        expect(described_class.in_sbmm_order).to eq([newer, older])
      end

      it 'breaks updated_at ties by the macromolecule short name' do
        timestamp = 1.day.ago
        second = create_sbmm_sample(sequence_based_macromolecule: create(:uniprot_sbmm, short_name: 'B'),
                                    updated_at: timestamp)
        first = create_sbmm_sample(sequence_based_macromolecule: create(:uniprot_sbmm, short_name: 'A'),
                                   updated_at: timestamp)

        expect(described_class.in_sbmm_order).to eq([first, second])
      end
    end

    describe '.in_sbmm_sequence_order' do
      it 'orders by the macromolecule sequence' do
        second = create_sbmm_sample(sequence_based_macromolecule: create(:uniprot_sbmm, sequence: 'MWWW'))
        first = create_sbmm_sample(sequence_based_macromolecule: create(:uniprot_sbmm, sequence: 'MAAA'))

        expect(described_class.in_sbmm_sequence_order).to eq([first, second])
      end
    end
  end

  describe 'pg_search scopes' do
    let!(:matching) { create_sbmm_sample(name: 'Lysozyme prep', organism: 'Gallus gallus') }

    before { create_sbmm_sample(name: 'Other prep', organism: 'Homo sapiens') }

    it 'finds samples by their own name' do
      expect(described_class.search_by_sbmm_sample_name('Lysozyme')).to contain_exactly(matching)
    end

    it 'finds samples by their own organism' do
      expect(described_class.search_by_sbmm_sample_organism('Gallus')).to contain_exactly(matching)
    end

    it 'finds samples by the associated macromolecule short name' do
      named = create_sbmm_sample(sequence_based_macromolecule: create(:uniprot_sbmm, short_name: 'Aminotransferase'))

      expect(described_class.search_by_sbmm_short_name('Aminotransferase')).to contain_exactly(named)
    end

    it 'finds samples by a partial term with search_by_substring' do
      expect(described_class.search_by_substring('Lysoz')).to include(matching)
    end
  end

  describe '.by_search_fields' do
    before do
      create_sbmm_sample(name: 'Kinase sample', short_label: 'KS-1', strain: 'K-12')
      create_sbmm_sample(name: 'Unrelated', short_label: 'U-1',
                         sequence_based_macromolecule: create(:uniprot_sbmm, short_name: 'Kinase X',
                                                                             ec_numbers: ['2.7.11.1']))
    end

    it 'returns the matching values per field, case-insensitively' do
      result = described_class.by_search_fields('kinase')

      expect(result['sbmm_sample_name']).to eq(['Kinase sample'])
      expect(result['sbmm_short_name']).to eq(['Kinase X'])
      expect(result['sbmm_sample_short_label']).to eq([])
    end

    it 'searches inside the ec_numbers array' do
      expect(described_class.by_search_fields('2.7.11')['sbmm_ec_numbers']).to eq(['2.7.11.1'])
    end

    it 'returns every search field key' do
      expect(described_class.by_search_fields('none').keys).to contain_exactly(
        'sbmm_sample_name', 'sbmm_sample_short_label', 'sbmm_sample_organism', 'sbmm_sample_taxon_id',
        'sbmm_sample_strain', 'sbmm_sample_tissue', 'sbmm_systematic_name', 'sbmm_short_name',
        'sbmm_other_identifier', 'sbmm_own_identifier', 'sbmm_ec_numbers', 'sbmm_organism', 'sbmm_taxon_id',
        'sbmm_strain', 'sbmm_tissue'
      )
    end

    it 'treats LIKE wildcards in the query literally' do
      expect(described_class.by_search_fields('K_1')['sbmm_sample_short_label']).to eq([])
    end
  end

  describe '.user_count_for_sbmm' do
    before do
      create_sbmm_sample
      create_sbmm_sample
      create_sbmm_sample(user: other_user)
      create_sbmm_sample(user: other_user, sequence_based_macromolecule: create(:uniprot_sbmm))
    end

    it 'counts the distinct users with samples of the macromolecule' do
      expect(described_class.user_count_for_sbmm(sbmm_id: sbmm.id)).to eq(2)
    end

    it 'excludes the given user' do
      expect(described_class.user_count_for_sbmm(sbmm_id: sbmm.id, except_user_id: user.id)).to eq(1)
    end
  end

  describe '#analyses' do
    context 'when the sample has no container' do
      it 'returns an empty list' do
        expect(sbmm_sample.analyses).to eq([])
      end
    end

    context 'when the sample has a root container with analyses' do
      it 'returns the analysis containers' do
        sbmm_sample.update!(container: Container.create_root_container)
        analysis = sbmm_sample.container.analyses_container.children.create!(container_type: 'analysis')

        expect(sbmm_sample.reload.analyses).to contain_exactly(analysis)
      end
    end
  end

  describe '#auto_assign_short_label' do
    context 'when no short label is given' do
      it 'builds the label from the user abbreviation and counter' do
        sample = create_sbmm_sample(short_label: nil)

        expect(sample.short_label).to eq("#{user.name_abbreviation}-sbmmS1")
      end

      it 'increments the user counter' do
        create_sbmm_sample(short_label: nil)
        second = create_sbmm_sample(short_label: nil)

        expect(second.short_label).to eq("#{user.name_abbreviation}-sbmmS2")
        expect(user.reload.counters['sequence_based_macromolecule_samples']).to eq('2')
      end
    end

    context 'when a short label is given' do
      it 'keeps it and does not touch the counter' do
        sample = create_sbmm_sample(short_label: 'custom')

        expect(sample.short_label).to eq('custom')
        expect(user.reload.counters['sequence_based_macromolecule_samples']).to be_nil
      end
    end

    context 'when the sample has no user' do
      it 'leaves the short label empty' do
        sample = build(:sequence_based_macromolecule_sample, short_label: nil, user: nil)
        sample.auto_assign_short_label

        expect(sample.short_label).to be_nil
      end
    end
  end

  describe '#counter_for_split_short_label' do
    let(:parent) { create_sbmm_sample(short_label: 'P') }

    context 'without children' do
      it 'returns 0' do
        expect(parent.counter_for_split_short_label).to eq(0)
      end
    end

    context 'with split children' do
      it 'returns the highest counter from the children labels' do
        create_sbmm_sample(short_label: 'P-1', parent: parent)
        create_sbmm_sample(short_label: 'P-5', parent: parent)

        expect(parent.counter_for_split_short_label).to eq(5)
      end

      it 'returns the children count when it exceeds the label counter' do
        create_sbmm_sample(short_label: 'P-1', parent: parent)
        create_sbmm_sample(short_label: 'renamed-a', parent: parent)
        create_sbmm_sample(short_label: 'renamed-b', parent: parent)

        expect(parent.counter_for_split_short_label).to eq(3)
      end

      it 'takes soft-deleted children into account' do
        create_sbmm_sample(short_label: 'P-1', parent: parent)
        create_sbmm_sample(short_label: 'P-2', parent: parent).destroy

        expect(parent.counter_for_split_short_label).to eq(2)
      end
    end
  end

  describe '#all_collections' do
    let(:collection) { create(:collection, user: user) }
    let(:all_collection) { Collection.find_by(user: user, label: 'All', is_locked: true) }

    it 'returns the given collections plus the locked All collection of the user' do
      expect(sbmm_sample.all_collections(user, [collection.id])).to contain_exactly(collection, all_collection)
    end

    it 'does not return the All collection of another user' do
      foreign_all_collection = Collection.find_by(user: other_user, label: 'All', is_locked: true)

      expect(sbmm_sample.all_collections(user, [])).to contain_exactly(all_collection)
      expect(foreign_all_collection).to be_present
    end
  end

  describe '#create_sub_sequence_based_macromolecule_sample' do
    let(:parent) { create_sbmm_sample(short_label: 'P', name: 'Parent', organism: 'E. coli') }
    let(:collection) { create(:collection, user: other_user) }
    let(:all_collection) { Collection.find_by(user: other_user, label: 'All', is_locked: true) }

    it 'creates a persisted child copying the attributes of the parent' do
      child = parent.create_sub_sequence_based_macromolecule_sample(other_user, [collection.id])

      expect(child).to be_persisted
      expect(child).to have_attributes(parent: parent, name: 'Parent', organism: 'E. coli')
    end

    it 'suffixes the parent label with the next split counter' do
      create_sbmm_sample(short_label: 'P-3', parent: parent)

      child = parent.create_sub_sequence_based_macromolecule_sample(other_user, [collection.id])

      expect(child.short_label).to eq('P-4')
    end

    it 'assigns the child to the given user and their collections' do
      child = parent.create_sub_sequence_based_macromolecule_sample(other_user, [collection.id])

      expect(child.user_id).to eq(other_user.id)
      expect(child.collections).to contain_exactly(collection, all_collection)
    end

    it 'gives the child its own root container' do
      child = parent.create_sub_sequence_based_macromolecule_sample(other_user, [collection.id])

      expect(child.container).to have_attributes(container_type: 'root', persisted?: true)
    end
  end

  describe '#label_text' do
    it 'prefers the name' do
      expect(build(:sequence_based_macromolecule_sample, name: 'N', short_label: 'S').label_text).to eq('N')
    end

    it 'falls back to the short label when the name is blank' do
      expect(build(:sequence_based_macromolecule_sample, name: '', short_label: 'S').label_text).to eq('S')
    end

    it 'falls back to SBMM when both are blank' do
      expect(build(:sequence_based_macromolecule_sample, name: nil, short_label: '').label_text).to eq('SBMM')
    end
  end

  describe '#svg_text_path' do
    it 'builds the path from the label text' do
      expect(build(:sequence_based_macromolecule_sample, name: 'Lysozyme').svg_text_path).to eq('svg_text/Lysozyme')
    end
  end

  describe '#resources_tag' do
    let(:reaction) { create(:reaction) }

    context 'without reactions' do
      it 'returns an empty list' do
        expect(sbmm_sample.resources_tag).to eq([])
      end
    end

    context 'with linked reactions' do
      before do
        ReactionsReactantSbmmSample.create!(reaction: reaction, sequence_based_macromolecule_sample: sbmm_sample)
      end

      it 'lists each reaction as a resource' do
        expect(sbmm_sample.resources_tag).to contain_exactly(
          resource_context_type: 'Reaction', resource_context_id: reaction.id,
          resource_context_label: reaction.short_label
        )
      end

      it 'skips soft-deleted reactions' do
        reaction.update_columns(deleted_at: Time.current) # rubocop:disable Rails/SkipsModelValidations

        expect(sbmm_sample.reload.resources_tag).to eq([])
      end
    end
  end

  describe 'callbacks' do
    it 'creates a code log after create' do
      expect(sbmm_sample.code_log).to have_attributes(source: 'sequence_based_macromolecule_sample',
                                                      source_id: sbmm_sample.id)
    end

    it 'stores the collection ids in the tag on save' do
      collection = create(:collection, user: user)
      sample = create_sbmm_sample(collections: [collection])

      expect(sample.tag.taggable_data['collection_labels']).to eq([{ 'id' => collection.id }])
    end
  end

  describe 'ancestry' do
    it 'moves children to the grandparent when their parent is destroyed' do
      grandparent = create_sbmm_sample
      parent = create_sbmm_sample(parent: grandparent)
      child = create_sbmm_sample(parent: parent)

      parent.destroy

      expect(child.reload.parent).to eq(grandparent)
    end
  end
end
