# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Delayed::LogidzeUuidPlugin do
  let(:container) { create(:container, name: 'before') }

  def run_job(name)
    job = Delayed::Job.new(payload_object: Delayed::PerformableMethod.new(container, :update!, [{ name: name }]))
    job.invoke_job
  end

  def uuid_of_last_version
    Container.with_log_data.find(container.id).log_data.versions.last.data.dig('m', 'uuid')
  end

  it 'gives each job its own version uuid and clears it afterwards' do
    uuids = %w[first second].map do |name|
      run_job(name)
      uuid_of_last_version
    end

    expect(uuids).to all(be_present)
    expect(uuids.uniq.size).to eq 2
    expect(Logidze.uuid_set?).to be false
  end

  it "keeps the request's uuid for a job run inline within it" do
    Logidze.with_responsible!(create(:person).id)
    container.update!(name: 'in request')
    request_uuid = uuid_of_last_version
    run_job('inline job')

    expect(uuid_of_last_version).to eq request_uuid
    expect(Logidze.uuid_set?).to be true
  ensure
    Logidze.clear_responsible!
  end
end
