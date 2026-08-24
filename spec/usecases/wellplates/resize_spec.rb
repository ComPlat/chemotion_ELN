# frozen_string_literal: true

RSpec.describe Usecases::Wellplates::Resize do
  subject(:resize) { described_class.new(wellplate: wellplate, width: width, height: height).execute! }

  # A well created straight from the column defaults: no sample, the default
  # label, and the default single blank readout. This is what an untouched well
  # of a freshly sized plate looks like, and it must never block a shrink.
  def untouched_well(plate, pos_x, pos_y)
    plate.wells.create!(position_x: pos_x, position_y: pos_y)
  end

  def fill_grid(plate)
    (1..plate.height).each { |pos_y| (1..plate.width).each { |pos_x| untouched_well(plate, pos_x, pos_y) } }
  end

  describe 'growing' do
    context 'when the wellplate has no size yet' do
      let(:wellplate) { create(:wellplate, width: 0, height: 0) }
      let(:width) { 2 }
      let(:height) { 3 }

      it 'applies the new dimensions' do
        expect([resize.width, resize.height]).to eq [2, 3]
      end

      it 'materialises the full grid of wells' do
        expect(resize.wells.count).to eq 6
      end

      it 'creates one well per position' do
        positions = resize.wells.pluck(:position_x, :position_y)
        expect(positions).to contain_exactly([1, 1], [2, 1], [1, 2], [2, 2], [1, 3], [2, 3])
      end
    end

    context 'when the wellplate already holds samples' do
      # :with_transient_wells builds its wells rather than creating them, which
      # leaves sample_id nil, so place the samples explicitly here.
      let(:wellplate) { create(:wellplate, width: 2, height: 3) }
      let(:width) { 4 }
      let(:height) { 3 }

      before do
        (1..3).each do |pos_y|
          (1..2).each { |pos_x| wellplate.wells.create!(position_x: pos_x, position_y: pos_y, sample: create(:sample)) }
        end
        wellplate.wells.reset
      end

      it 'keeps every existing well' do
        existing = wellplate.wells.pluck(:position_x, :position_y)
        expect(resize.wells.pluck(:position_x, :position_y)).to include(*existing)
      end

      it 'adds only the missing wells' do
        expect(resize.wells.count).to eq 12
      end

      it 'keeps the samples that were already placed' do
        expect(resize.wells.filter_map(&:sample).size).to eq 6
      end
    end
  end

  describe 'shrinking' do
    let(:wellplate) { create(:wellplate, width: 4, height: 3) }
    let(:width) { 2 }
    let(:height) { 2 }

    before { fill_grid(wellplate) }

    context 'when every dropped well is untouched' do
      it 'applies the new dimensions' do
        expect([resize.width, resize.height]).to eq [2, 2]
      end

      it 'deletes the wells outside the new grid' do
        expect(resize.wells.count).to eq 4
      end

      it 'leaves no well outside the new grid' do
        outside = resize.wells.select { |well| well.position_x > 2 || well.position_y > 2 }
        expect(outside).to be_empty
      end
    end

    context 'when a dropped well holds a sample' do
      before { wellplate.wells.find_by(position_x: 4, position_y: 3).update!(sample: create(:sample)) }

      it 'refuses the resize' do
        expect { resize }.to raise_error(Usecases::Wellplates::Errors::ResizeNotAllowedError, /still hold/)
      end

      it 'names the blocking position' do
        expect { resize }.to raise_error(/C4/)
      end

      it 'leaves the dimensions untouched' do
        expect { resize }.to raise_error(Usecases::Wellplates::Errors::ResizeNotAllowedError)
        expect([wellplate.reload.width, wellplate.height]).to eq [4, 3]
      end

      it 'leaves the wells untouched' do
        expect { resize }.to raise_error(Usecases::Wellplates::Errors::ResizeNotAllowedError)
        expect(wellplate.reload.wells.count).to eq 12
      end
    end

    context 'when a dropped well holds data other than a sample' do
      # Each of these is user-entered content that a shrink would silently
      # destroy, so each must block it on its own.
      {
        'readouts' => { readouts: [{ 'value' => '42', 'unit' => 'nM' }] },
        'a label' => { label: 'my label' },
        'a colour code' => { color_code: '#aabbcc' },
        'an additive' => { additive: 'DMSO' },
      }.each do |description, attributes|
        it "refuses the resize for a well with #{description}" do
          wellplate.wells.find_by(position_x: 4, position_y: 3).update!(attributes)
          expect { resize }.to raise_error(Usecases::Wellplates::Errors::ResizeNotAllowedError)
        end
      end
    end

    context 'when a dropped well points at a soft-deleted sample' do
      # update_wells destroys samples without nulling wells.sample_id, so a
      # dangling id is a normal state and must read as empty.
      before do
        sample = create(:sample)
        wellplate.wells.find_by(position_x: 4, position_y: 3).update!(sample: sample)
        sample.destroy
      end

      it 'allows the resize' do
        expect(resize.wells.count).to eq 4
      end
    end
  end

  describe 'wells with no position' do
    let(:wellplate) { create(:wellplate, width: 2, height: 2) }
    let(:width) { 2 }
    let(:height) { 2 }

    before do
      fill_grid(wellplate)
      wellplate.wells.create!(position_x: nil, position_y: nil)
      wellplate.wells.reset
    end

    it 'treats an unplaceable well as outside the grid and removes it' do
      # The size is unchanged, so force the reconciliation with a real change.
      resized = described_class.new(wellplate: wellplate, width: 3, height: 2).execute!
      expect(resized.wells.where(position_x: nil)).to be_empty
    end
  end

  describe 'no-op' do
    let(:wellplate) { create(:wellplate, :with_transient_wells, width: 2, height: 2) }
    let(:width) { 2 }
    let(:height) { 2 }

    it 'returns the wellplate unchanged' do
      expect([resize.width, resize.height]).to eq [2, 2]
    end

    it 'does not touch the wells' do
      expect { resize }.not_to(change { wellplate.wells.count })
    end
  end

  describe 'invalid dimensions' do
    let(:wellplate) { create(:wellplate, width: 2, height: 2) }

    context 'with only one dimension zero' do
      let(:width) { 0 }
      let(:height) { 8 }

      it 'is rejected' do
        expect { resize }.to raise_error(Usecases::Wellplates::Errors::InvalidDimensionsError, /both width and height/)
      end
    end

    context 'with a dimension above the maximum' do
      let(:width) { described_class::MAX_DIMENSION + 1 }
      let(:height) { 8 }

      it 'is rejected' do
        expect { resize }.to raise_error(Usecases::Wellplates::Errors::InvalidDimensionsError, /between 0 and 100/)
      end
    end

    context 'with a negative dimension' do
      let(:width) { -1 }
      let(:height) { 8 }

      it 'is rejected' do
        expect { resize }.to raise_error(Usecases::Wellplates::Errors::InvalidDimensionsError)
      end
    end
  end
end
