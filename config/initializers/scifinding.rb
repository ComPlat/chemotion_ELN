Bundler.load.current_dependencies.select{  |dep|  dep.groups.include?(:plugins)}.map(&:name).include?("scifinding") && Scifinding.configure do |config|
  config.client_id  = ENV['SF_CLIENT_ID']
  config.client_key = ENV['SF_CLIENT_KEY']
  config.site = ENV['SF_SITE']
  config.passphrase =  ENV['SF_PASS_PHRASE']
end
