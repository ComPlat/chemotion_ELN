# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Versioning::Merger do
  def version(time, uuid, klass_name = 'Sample')
    { db_id: 1, klass_name: klass_name, name: [klass_name], time: Time.zone.at(time), user: 'User', uuid: uuid,
      changes: {} }
  end

  def merged(*versions)
    described_class.call(versions: versions).map { |entry| [entry[:time].to_i, entry[:changes].size] }
  end

  it 'merges the changes of one request across records into one entry' do
    expect(merged(version(10, 'a'), version(10, 'a', 'Container'))).to eq [[10, 2]]
  end

  it 'keeps changes made outside a request (no uuid) apart when a request lies between them, in time order' do
    expect(merged(version(10, nil), version(20, 'a'), version(30, nil))).to eq [[30, 1], [20, 1], [10, 1]]
  end

  it 'merges consecutive changes made outside a request into one entry' do
    expect(merged(version(10, nil), version(12, nil, 'Container'), version(20, 'a'))).to eq [[20, 1], [12, 2]]
  end
end
