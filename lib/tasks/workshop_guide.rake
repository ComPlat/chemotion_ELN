# frozen_string_literal: true

# Enabling / disabling the in-app Workshop Guide is content-driven, not a flag:
#   * Enable  -> run `workshop_guide:sync` so wiki content lands in public/workshop;
#               the /mydb drawer and /home inline block detect it and appear.
#   * Disable -> remove the checkout (rm -rf public/workshop, keeping .keep).
#               With no content present both widgets render nothing, so the
#               app is the usual ELN.
# public/workshop is gitignored, so the content is a runtime checkout only.
namespace :workshop_guide do
  desc 'Clone or update the Chemotion workshop wiki into public/workshop. ' \
       'Configure via env: WORKSHOP_GUIDE_REPO (required, the git URL of a ' \
       'wiki repo, e.g. https://oauth2:<token>@<git-host>/<group>/<project>.wiki.git), ' \
       'WORKSHOP_GUIDE_BRANCH (optional, defaults to master).'
  task :sync do
    repo = ENV['WORKSHOP_GUIDE_REPO']
    abort 'WORKSHOP_GUIDE_REPO env var is required' if repo.nil? || repo.empty?

    branch = ENV.fetch('WORKSHOP_GUIDE_BRANCH', 'master')
    target = Rails.public_path.join('workshop')

    if target.join('.git').exist?
      puts "Updating #{target}"
      system('git', '-C', target.to_s, 'fetch', '--depth=1', 'origin', branch, exception: true)
      system('git', '-C', target.to_s, 'reset', '--hard', "origin/#{branch}", exception: true)
    else
      puts "Cloning into #{target}"
      target.rmtree if target.exist?
      system('git', 'clone', '--depth=1', '--branch', branch, repo, target.to_s, exception: true)
    end

    puts 'Workshop guide synced.'
  end
end
