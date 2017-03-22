require 'rails_helper'

RSpec.describe ElementalComposition, type: :model do
  describe '.set_loading' do
    before do
      attrs_found = {
        composition_type: "found",
        data: { "C"=>"90", "H"=>"10" },
        loading: 3
      }
      attrs_expected = {
        composition_type: "full_conv",
        data: { "C"=>"95", "H"=>"5" },
        loading: 3
      }
      @sample = create(:sample)
      @residue = create(:residue)
      @sample.residues << @residue
      @el_comp_found = ElementalComposition.new(attrs_found)
      @el_comp_expected = ElementalComposition.new(attrs_expected)
      @sample.elemental_compositions << [@el_comp_found, @el_comp_expected]
    end

    context 'not product/reactant' do
      context 'from `found` composition' do
        it 'calculate loading' do
          @el_comp_found.set_loading(@sample)
          updated_loading = @el_comp_found.loading
          target = Chemotion::Calculations.get_loading(@sample.molecule.sum_formular,
                      @residue[:custom_info]["formula"],
                      @el_comp_found.data).to_f

          expect(updated_loading).to eq(target)
        end
      end

      context 'from `full_conv` composition' do
        let(:original_loading) { @el_comp_expected.loading }

        it 'take the original loading' do
          @el_comp_expected.set_loading(@sample)
          updated_loading = @el_comp_expected.loading

          expect(updated_loading).to eq(original_loading)
        end
      end
    end

    context 'product/reactant' do
      before do
        reaction = create(:reaction)
        ReactionsStartingMaterialSample.create!(sample: @sample, reaction: reaction)
        ReactionsReactantSample.create!(sample: @sample, reaction: reaction)
        ReactionsProductSample.create!(sample: @sample, reaction: reaction)
        @sample.reload
      end
      it 'calculate loading from amount & yield' do
        updated_loading = @el_comp_found.set_loading(@sample)

        product_yield = Chemotion::Calculations.get_yield(@el_comp_found.data,
                          {"H"=>"11.19", "O"=>"88.81"},
                          @el_comp_expected.data)
        new_amount = @sample.amount_mmol * product_yield
        amount = @sample.amount_mg
        target = new_amount / amount * 1000.0

        expect(updated_loading).to eq(target)
      end
    end
  end
end
