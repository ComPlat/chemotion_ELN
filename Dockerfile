# This Dockerfile is intended to build a production-ready app image
FROM phusion/passenger-ruby23:0.9.25

# Add the app's binaries path to $PATH
ENV PATH /usr/local/rvm/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH
ENV APP_HOME /home/app/chemotion_ELN
ENV BUNDLE_PATH /bundle

# Set correct environment variables
ENV HOME /root
# Use baseimage-docker's init process.
CMD ["/sbin/my_init"]

# Expose the web port
EXPOSE 3000

# prepare
RUN add-apt-repository ppa:inkscape.dev/stable && \
  apt-get -y update --fix-missing && \
  apt-get -y install ca-certificates apt-transport-https git \
      imagemagick libmagic-dev libmagickcore-dev libmagickwand-dev curl \
      libappindicator1 swig \
      fonts-liberation xvfb gconf-service libasound2 libgconf-2-4 cmake \
      libnspr4 libnss3 libpango1.0-0 libxss1 xdg-utils libpq-dev \
      gtk2-engines-pixbuf xfonts-cyrillic xfonts-100dpi xfonts-75dpi \
      xfonts-base xfonts-scalable apt-utils cmake inkscape \
      libeigen3-dev build-essential wget nodejs sudo postgresql-client \
      libmagickcore-dev libmagickwand-dev imagemagick tzdata --fix-missing

# WORKDIR /tmp
# node + npm via nvm; install npm packages
WORKDIR $APP_HOME
RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.5/install.sh | NVM_DIR=/usr/local/nvm bash
# Gem caching
WORKDIR /tmp
ADD Gemfile /tmp/
ADD Gemfile.lock /tmp/
ADD package.json /tmp/
ADD .nvmrc /tmp/

RUN /bin/bash -c 'bundle install'
RUN /bin/bash -c 'source /usr/local/nvm/nvm.sh;\
  nvm install;\
  nvm use;\
  npm install;'

WORKDIR $APP_HOME
ADD . $APP_HOME
RUN cp -a /tmp/node_modules $APP_HOME

RUN echo '[ -s /usr/local/nvm/nvm.sh ] && . /usr/local/nvm/nvm.sh' >> /home/app/.bashrc

# nginx. https://github.com/phusion/passenger-docker#configuring-nginx
RUN rm -f /etc/service/nginx/down
RUN rm /etc/nginx/sites-enabled/default
ADD webapp.conf /etc/nginx/sites-enabled/webapp.conf
ADD secret_key.conf /etc/nginx/main.d/secret_key.conf
ADD gzip_max.conf /etc/nginx/conf.d/gzip_max.conf
ADD postgres-env.conf /etc/nginx/main.d/postgres-env.conf
ADD rails-env.conf /etc/nginx/main.d/rails-env.conf
ADD app-env.conf /etc/nginx/config.d/00_app_env.conf

# configure app
RUN cp -a config/database.yml.example config/database.yml
RUN chmod +x run.sh
# RUN chown -R app:app $APP_HOME
RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
