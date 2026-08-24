# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Versioning::Reverters::WellplateReverter do
  let(:wellplate) { create(:wellplate, name: 'Original name', width: 12, height: 8) }

  def revert(fields)
    described_class.call('db_id' => wellplate.id, 'fields' => fields)
    wellplate.reload
  end

  it 'reverts an ordinary field' do
    revert([{ 'name' => 'name', 'value' => 'Reverted name' }])

    expect(wellplate.name).to eq 'Reverted name'
  end

  # BaseReverter writes with update_columns, bypassing validations and
  # callbacks, so the FORBIDDEN_FIELDS filter is the only thing standing between
  # a crafted payload and a grid resized behind Usecases::Wellplates::Resize's
  # occupied-well guard.
  it 'ignores width' do
    expect { revert([{ 'name' => 'width', 'value' => 2 }]) }.not_to change(wellplate, :width)
  end

  it 'ignores height' do
    expect { revert([{ 'name' => 'height', 'value' => 2 }]) }.not_to change(wellplate, :height)
  end

  # Old logidze snapshots carry the misspelling from before the column was
  # renamed, so the blacklist has to cover it too.
  it 'ignores the legacy heigth misspelling' do
    expect { revert([{ 'name' => 'heigth', 'value' => 2 }]) }.not_to raise_error
  end

  it 'still applies allowed fields alongside a forbidden one' do
    revert([{ 'name' => 'width', 'value' => 2 }, { 'name' => 'name', 'value' => 'Reverted name' }])

    expect([wellplate.name, wellplate.width]).to eq ['Reverted name', 12]
  end
end
