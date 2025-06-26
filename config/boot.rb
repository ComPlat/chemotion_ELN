ENV['BUNDLE_GEMFILE'] ||= File.expand_path('../Gemfile', __dir__)

require 'bundler/setup' # Set up gems listed in the Gemfile.
require "logger" # Fix concurrent-ruby removing logger dependency rails < 7.1
require 'bootsnap/setup' # Speed up boot time by caching expensive operations.
