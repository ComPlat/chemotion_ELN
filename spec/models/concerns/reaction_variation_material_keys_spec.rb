# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ReactionVariationMaterialKeys do
  let(:user) { create(:user) }
  let(:molecule) { create(:molecule) }
  let(:other_molecule) { create(:molecule) }
  let(:source) { create(:reaction, creator: user) }
  let(:reaction) { create(:reaction, creator: user, origin: { 'id' => source.id }) }

  def link(target, link_class, sample, position)
    link_class.create!(reaction: target, sample: sample, position: position)
    sample
  end

  def link_sbmm(target, sbmm_sample, position)
    ReactionsReactantSbmmSample.create!(
      reaction: target, sequence_based_macromolecule_sample: sbmm_sample, position: position,
    )
    sbmm_sample
  end

  def variation(groups)
    { 'id' => 1, 'uuid' => SecureRandom.uuid, 'startingMaterials' => {}, 'reactants' => {}, 'products' => {},
      'solvents' => {} }.merge(groups.transform_keys(&:to_s))
  end

  def entry(mass)
    { 'mass' => { 'value' => mass, 'unit' => 'g' } }
  end

  def create_sbmm_sample(sbmm = create(:uniprot_sbmm))
    SequenceBasedMacromoleculeSample.create!(
      name: 'SBMM sample', short_label: 'SBMM-1', sequence_based_macromolecule: sbmm, user: user,
    )
  end

  def reconcile(groups, **options)
    reaction[:variations] = [variation(groups)]
    reaction.reconcile_variation_material_keys(**options).first
  end

  describe '.variations_group_for' do
    it 'maps the material groups of UpdateMaterials to the variations groups' do
      expect(described_class.variations_group_for('starting_material')).to eq('startingMaterials')
      expect(described_class.variations_group_for('reactant_sbmm')).to eq('reactants')
      expect(described_class.variations_group_for('purification_solvent')).to be_nil
    end
  end

  describe '#reconcile_variation_material_keys' do
    it "keeps the reaction's own keys, including its own SBMM samples, and drops the others" do
      own = link(reaction, ReactionsStartingMaterialSample, create(:sample, molecule: molecule), 0)
      sbmm_sample = link_sbmm(reaction, create_sbmm_sample, 0)

      reconciled = reconcile(
        startingMaterials: { own.id.to_s => entry(1), '999001' => entry(2) },
        reactants: { "sbmm:#{sbmm_sample.id}" => entry(3) },
      )

      expect(reconciled['startingMaterials']).to eq(own.id.to_s => entry(1))
      expect(reconciled['reactants']).to eq("sbmm:#{sbmm_sample.id}" => entry(3))
    end

    it 'drops the key of a removed (soft-deleted) material' do
      own = link(reaction, ReactionsStartingMaterialSample, create(:sample, molecule: molecule), 0)
      removed = link(reaction, ReactionsStartingMaterialSample, create(:sample, molecule: molecule), 1)
      removed.destroy

      reconciled = reconcile(startingMaterials: { own.id.to_s => entry(1), removed.id.to_s => entry(2) })

      expect(reconciled['startingMaterials']).to eq(own.id.to_s => entry(1))
    end

    it 'reports dropped keys through on_drop' do
      dropped = []

      reconcile({ products: { '999001' => entry(1) } }, on_drop: ->(*args) { dropped << args })

      expect(dropped).to eq([['products', '999001', entry(1)]])
    end

    it 'translates keys through the key map exactly' do
      copied = link(reaction, ReactionsStartingMaterialSample, create(:sample, molecule: molecule), 0)

      reconciled = reconcile(
        { startingMaterials: { 'preliminary-uuid' => entry(1) } },
        key_map: { 'startingMaterials' => { 'preliminary-uuid' => copied.id.to_s } },
      )

      expect(reconciled['startingMaterials']).to eq(copied.id.to_s => entry(1))
    end

    it "keeps the reaction's own entry when a mapped key resolves to the same material" do
      own = link(reaction, ReactionsStartingMaterialSample, create(:sample, molecule: molecule), 0)

      reconciled = reconcile(
        { startingMaterials: { 'stale' => entry(1), own.id.to_s => entry(2) } },
        key_map: { 'startingMaterials' => { 'stale' => own.id.to_s } },
      )

      expect(reconciled['startingMaterials']).to eq(own.id.to_s => entry(2))
    end

    context 'with the origin reaction' do
      # Source materials of the same molecule whose id order differs from their position order.
      let!(:source_second) { create(:sample, molecule: molecule) }
      let!(:source_first) { create(:sample, molecule: molecule) }
      let!(:copied_first) { create(:sample, molecule: molecule) }
      let!(:copied_second) { create(:sample, molecule: molecule) }
      let(:source_keys) { { source_first.id.to_s => entry(1), source_second.id.to_s => entry(2) } }

      before do
        link(source, ReactionsStartingMaterialSample, source_first, 0)
        link(source, ReactionsStartingMaterialSample, source_second, 1)
        link(reaction, ReactionsStartingMaterialSample, copied_first, 0)
        link(reaction, ReactionsStartingMaterialSample, copied_second, 1)
      end

      it "maps the source reaction's keys by group position, not by id" do
        expect(source_second.id).to be < source_first.id

        reconciled = reconcile({ startingMaterials: source_keys }, origin_reaction: source)

        expect(reconciled['startingMaterials']).to eq(
          copied_first.id.to_s => entry(1), copied_second.id.to_s => entry(2),
        )
      end

      it 'drops a key whose position holds a different molecule in the copy' do
        copied_second.update!(molecule: other_molecule)

        reconciled = reconcile({ startingMaterials: source_keys }, origin_reaction: source)

        expect(reconciled['startingMaterials']).to eq(copied_first.id.to_s => entry(1))
      end

      it 'is not applied without the origin reaction' do
        expect(reconcile(startingMaterials: source_keys)['startingMaterials']).to eq({})
      end
    end

    it 'does not pair molecule-less materials by position' do
      source_sample = link(source, ReactionsProductSample, create(:sample), 0)
      copied_sample = link(reaction, ReactionsProductSample, create(:sample), 0)
      [source_sample, copied_sample].each { |sample| sample.update_column(:molecule_id, nil) } # rubocop:disable Rails/SkipsModelValidations

      reconciled = reconcile({ products: { source_sample.id.to_s => entry(3) } }, origin_reaction: source)

      expect(reconciled['products']).to eq({})
    end

    it 'pairs SBMM samples by position only when they are the same macromolecule' do
      macromolecule = create(:uniprot_sbmm)
      source_same = link_sbmm(source, create_sbmm_sample(macromolecule), 0)
      source_other = link_sbmm(source, create_sbmm_sample, 1)
      copied_same = link_sbmm(reaction, create_sbmm_sample(macromolecule), 0)
      link_sbmm(reaction, create_sbmm_sample, 1)

      reconciled = reconcile(
        { reactants: { "sbmm:#{source_same.id}" => entry(4), "sbmm:#{source_other.id}" => entry(5) } },
        origin_reaction: source,
      )

      expect(reconciled['reactants']).to eq("sbmm:#{copied_same.id}" => entry(4))
    end
  end
end
