# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Versioning::Reverter do
  it 'applies a request completely or not at all' do
    first = create(:sample, name: 'current')
    second = create(:sample, purity: 0.5)
    changes = [
      { 'klass_name' => 'Sample', 'db_id' => first.id, 'fields' => [{ 'name' => 'name', 'value' => 'old' }] },
      { 'klass_name' => 'Sample', 'db_id' => second.id, 'fields' => [{ 'name' => 'purity', 'value' => 5 }] },
    ]

    expect { described_class.call(changes) }.to raise_error(StandardError, /purity/i)
    expect(first.reload.name).to eq 'current'
  end
end
