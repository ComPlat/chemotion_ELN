# frozen_string_literal: true

require 'rails_helper'

describe InventoryIntegration::Redactor do
  after { described_class.reset! }

  it 'masks registered values, raw and URL-encoded, in nested data' do
    described_class.register('s3cr3t/key+1')
    data = { 'url' => 'https://h/rest.cgi/s3cr3t%2Fkey%2B1/q', 'list' => ['token s3cr3t/key+1 end', 3] }
    expect(described_class.redact(data)).to eq(
      'url' => 'https://h/rest.cgi/[FILTERED]/q', 'list' => ['token [FILTERED] end', 3],
    )
  end

  it 'leaves values too short to mask safely alone' do
    described_class.register('abc')
    expect(described_class.redact('abc def')).to eq 'abc def'
  end
end
