# Be sure to restart your server when you modify this file.

# Add new inflection rules using the following format. Inflections
# are locale specific, and you may define rules for as many different
# locales as you wish. All of these examples are active by default:
# ActiveSupport::Inflector.inflections(:en) do |inflect|
#   inflect.plural /^(ox)$/i, '\1en'
#   inflect.singular /^(ox)en/i, '\1'
#   inflect.irregular 'person', 'people'
#   inflect.uncountable %w( fish sheep )
# end

# These inflection rules are supported but not enabled by default:
# ActiveSupport::Inflector.inflections(:en) do |inflect|
#   inflect.acronym 'RESTful'
# end

# NOTE: The API / SFTP acronyms this app needs for Zeitwerk are intentionally
# defined in config/application.rb (application class body), NOT here. The Rails
# 6.1 -> 7.0 upgrade guide (§6.7 "Autoloading during initialization") recommends
# custom inflections live in the application body so they are in effect before any
# autoloading happens during initialization. See DEV_RAILS_UPGRADE_7-0.md §0a.
