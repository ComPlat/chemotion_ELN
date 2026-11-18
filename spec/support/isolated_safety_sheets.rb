# frozen_string_literal: true

# Every example gets an empty safety sheets folder of its own, so no spec can write into or
# delete from the saved sheets under public/. Tag :real_safety_sheets to read the real folder.
RSpec.configure do |config|
  config.before do |example|
    next if example.metadata[:real_safety_sheets]

    root = Pathname.new(Dir.mktmpdir('safety_sheets'))
    example.metadata[:isolated_safety_sheets_root] = root
    # Loaded first: stub_const on an unloaded parent would define an empty module in its place.
    Chemotion::GenerateFileHashUtils.safety_sheets_root
    stub_const('Chemotion::GenerateFileHashUtils::SAFETY_SHEETS_ROOT', root)
  end

  config.after do |example|
    root = example.metadata[:isolated_safety_sheets_root]
    FileUtils.rm_rf(root) if root
  end
end
