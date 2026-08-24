# frozen_string_literal: true

# rubocop:disable RSpec/NestedGroups

RSpec.describe Usecases::Wellplates::WellplateUpdater do
  let(:user) { create(:user) }
  let(:wellplate) { create(:wellplate) }

  let(:usecase) { described_class.new(wellplate: wellplate, current_user: user) }

  describe 'update_wells' do
    context 'when a submitted well is no longer on the wellplate' do
      # A concurrent resize soft-deletes the wells outside the new grid. An
      # unscoped Well.find would raise and roll back the whole save.
      let(:wellplate) { create(:wellplate, width: 2, height: 1) }
      let(:surviving) { wellplate.wells.create!(position_x: 1, position_y: 1) }
      let(:removed) { wellplate.wells.create!(position_x: 2, position_y: 1) }

      let(:new_wells) do
        [
          { id: surviving.id, position: { x: 1, y: 1 }, readouts: [{ 'value' => '7', 'unit' => 'nM' }] },
          { id: removed.id, position: { x: 2, y: 1 }, readouts: [] },
        ]
      end

      before { removed.destroy }

      it 'does not raise' do
        expect { usecase.update_wells(well_data: new_wells) }.not_to raise_error
      end

      it 'still applies the edits to the wells that remain' do
        usecase.update_wells(well_data: new_wells)
        expect(surviving.reload.readouts).to eq [{ 'value' => '7', 'unit' => 'nM' }]
      end
    end

    context 'when a submitted well belongs to a different wellplate' do
      let(:wellplate) { create(:wellplate, width: 1, height: 1) }
      let(:other_wellplate) { create(:wellplate, width: 1, height: 1) }
      let(:foreign_well) { other_wellplate.wells.create!(position_x: 1, position_y: 1, label: 'untouched') }

      let(:new_wells) { [{ id: foreign_well.id, position: { x: 1, y: 1 }, label: 'hijacked' }] }

      it 'leaves it alone' do
        usecase.update_wells(well_data: new_wells)
        expect(foreign_well.reload.label).to eq 'untouched'
      end
    end

    context 'when original wells were empty' do
      context 'with empty array as new wells' do
        let(:new_wells) { [] }

        before { usecase.update_wells(well_data: new_wells) }

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

        before { usecase.update_wells(well_data: new_wells) }

        it '2x3 wells array should be attached to wellplate' do
          expect(wellplate.wells.size).to eq 6
        end
      end
    end
  end
end
# rubocop:enable RSpec/NestedGroups
