# adapted from https://gist.github.com/servel333/47f6cca9e51497aeefab

## db/seeds.rb
['all', Rails.env].each do |seed|
  seed_file = Rails.root.join('db', 'seeds', "#{seed}.rb")
  if File.exists?(seed_file)
    puts "*** Loading #{seed} seed data"
    require seed_file
  end

  seed_dir = Rails.root.join('db', 'seeds', seed)
  if File.directory?(seed_dir)
    Dir[File.join(seed_dir, "*.rb")].sort.each do |file|
      puts "*** Loading #{seed} seed data from #{file}"
      require file
    end
  end

end

##############################
## Example of folder structure

## db/seeds/all.rb
# Seeds for all environments

## db/seeds/development.rb
# Seeds only for the "development" environment.

## db/seeds/test.rb
# Seeds only for the "test" environment.

## db/seeds/production.rb
# Seeds only for the "production" environment.

## db/seeds/development/users.rb
# Seeds only for the "development" environment.
# ... seed users ...

## db/seeds/production/users.rb
# Seeds only for the "production" environment.
# ... seed users ...


#########################################
## Recommended shared seeds files pattern

## db/seeds/shared/dev_users.rb
# Seeds for any environment but must be manually required
# ... create users only for some environments.

## db/seeds/development.rb
# Seeds only for the "development" environment.
# require_relative "shared/dev_users.rb"


