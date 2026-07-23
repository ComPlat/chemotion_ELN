# frozen_string_literal: true

require 'rails_helper'

# Guards the workaround in config/initializers/labimotion_converter_patch.rb.
#
# labimotion (<= 2.3.0.rc5) reads Labimotion::Prop::CONVERTER_FIELD_UINT_PREFIX in
# Converter.update_ds but never defines it, so the whole converter -> generic-dataset
# mapping dies with a NameError before a single key/value reaches the dataset — silently,
# because process_ds only logs to log/converter.log.
#
# If a gem bump ever changes this contract, this spec fails instead of the mapping quietly
# going back to a no-op.
# rubocop:disable RSpec/DescribeClass -- this covers an initializer, not a class
describe 'Labimotion converter unit-prefix patch' do
  it 'defines the constant Labimotion::Converter.update_ds depends on' do
    expect(Labimotion::Prop.const_defined?(:CONVERTER_FIELD_UINT_PREFIX)).to be true
  end

  it 'matches the prefix converter-app emits for unit identifiers' do
    expect(Labimotion::Prop::CONVERTER_FIELD_UINT_PREFIX).to eq '___unit___'
  end
end
# rubocop:enable RSpec/DescribeClass
