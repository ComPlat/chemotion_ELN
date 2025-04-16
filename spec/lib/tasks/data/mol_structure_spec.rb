# frozen_string_literal: true

require 'rails_helper'
require 'rake'

# rubocop:disable RSpec/BeforeAfterAll
# rubocop:disable RSpec/DescribeClass
describe 'data:molfile:fix' do
  before(:all) do
    Rake.application.rake_require('data/mol_structure') # path relative to lib/tasks (omit .rake)
    Rake::Task.define_task(:environment) # if not loading full Rails env
  end

  let(:task_name) { 'data:molfile:fix' }
  let(:task) { Rake::Task[task_name] }

  before do
    task.reenable # so it can be invoked multiple times
  end

  it 'runs without error' do
    expect { task.invoke }.not_to raise_error
  end

  # You can mock MoleculesSeed if you want
  it 'calls MoleculesSeed.process' do
    instance = instance_double(MoleculeStructureCuration, process: nil)
    allow(MoleculeStructureCuration).to receive(:new).and_return(instance)
    task.invoke
    expect(instance).to have_received(:process)
  end
end
# rubocop:enable RSpec/BeforeAfterAll
# rubocop:enable RSpec/DescribeClass
