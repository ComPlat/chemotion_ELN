# frozen_string_literal: true

# Be sure to restart your server when you modify this file.

# Version of your assets, change this if you want to expire all your assets.
Rails.application.config.assets.version = '1.0'

# Add additional assets to the asset load path
# Rails.application.config.assets.paths << Emoji.images_path

# Add Yarn node_modules folder to the asset load path.
# The env var NODE_MODULES_PATH is a hack only used by the Docker dev setup.
# There we had to move the node_modules directory outside of the app directory (for Mac+Docker specific issues),
# blocking regular access to the modules. The env var is set in the docker-compose-dev.yml file to reflect
# the changed path in this specific setup. For developers that do not use the Docker dev environment, the fallback
# should suffice.
node_modules_path = ENV['NODE_MODULES_PATH'] || 'node_modules'
Rails.application.config.assets.paths << Rails.root.join(node_modules_path)
Rails.application.config.assets.paths << Rails.root.join('vendor', 'assets', 'javascript')

# Precompile additional assets.
# application.js, application.css, and all non-JS/CSS in the app/assets
# folder are already added.
Rails.application.config.assets.precompile  = %w[manifest.js]
Rails.application.config.assets.precompile += %w( autocomplete.min.js )
Rails.application.config.assets.precompile += %w[grape_swagger_rails/application.css]
Rails.application.config.assets.precompile += %w[grape_swagger_rails/application.js]
