# frozen_string_literal: true

# rubocop:disable RSpec/NestedGroups

RSpec.describe Usecases::Wellplates::WellplateUpdater do
  let(:user) { create(:user) }
  let(:wellplate) { create(:wellplate) }

  let(:usecase) { described_class.new(wellplate: wellplate, current_user: user) }

  describe 'update_wells' do
    before do
      usecase.update_wells(well_data: new_wells)
    end

    context 'when original wells were empty' do
      context 'with empty array as new wells' do
        let(:new_wells) { [] }

        it 'empty wells should remain' do
          expect(wellplate.wells).to eq []
        end
      end

      context 'with 2x3 wells arrays without samples in it' do
        let(:new_wells) do
          new_wells = []
          (1..2).each do |pos_y|
            (1..3).each do |pos_x|
              well_hash = {}
              well_hash[:is_new] = true
              well_hash[:readout] = ''
              well_hash[:additive] = ''
              well_hash[:sample_id] = nil
              well_hash[:position] = {}
              well_hash[:position][:x] = pos_x
              well_hash[:position][:y] = pos_y
              new_wells << well_hash
            end
          end
          new_wells
        end

        it '2x3 wells array should be attached to wellplate' do
          expect(wellplate.wells.size).to eq 6
        end
      end
    end
  end
end
# rubocop:enable RSpec/NestedGroups
