server 'complat-eln-dev.ioc.kit.edu', user: 'chem_dev', roles: %w{app web db}

set :ssh_options, {
  forward_agent: false,
  auth_methods: %w(publickey)
}

set :deploy_to, '/home/chem_dev/www/chemotion'
set :user, 'chem_dev'
set :server, '172.22.91.42'
