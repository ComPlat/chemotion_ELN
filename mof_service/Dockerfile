# MOFid/MOFkey microservice.
#
# Bundles the snurr-group `mofid` pipeline (OpenBabel + C++ helpers + the
# Java/Systre topology matcher) behind a small Flask app so Chemotion can
# POST a CIF and get back the MOFid/MOFkey over HTTP.
FROM continuumio/miniconda3:24.5.0-0

# System / chemistry toolchain used to build and run mofid.
#
# Two version pins, both because `make init` builds mofid's bundled OpenBabel
# from source with an old vendored toolchain:
#   * cmake<4  — that submodule's CMakeLists declares cmake_minimum_required
#     below 3.5, which CMake 4.x refuses ("Compatibility with CMake < 3.5 has
#     been removed"). CMAKE_POLICY_VERSION_MINIMUM below is belt-and-suspenders.
#   * gcc/gxx 13 — OpenBabel vendors RapidJSON 1.1.0, which is a hard compile
#     error on GCC 14 ("assignment of read-only member") but builds cleanly on
#     GCC 13. conda-forge's default cxx-compiler now pulls GCC 14, so pin to 13.
RUN conda install -y -c conda-forge \
        python=3.11 \
        openbabel \
        openjdk \
        "cmake<4" \
        make \
        "gcc=13" \
        "gxx=13" \
    && conda clean -afy

ENV CMAKE_POLICY_VERSION_MINIMUM=3.5
# Point the mofid Makefile's CC/CXX (default gcc/g++) at the pinned toolchain.
ENV CC=gcc CXX=g++

# Build and install the mofid package. `make init` compiles the bundled C++
# binaries; `set_paths.py` bakes their absolute paths into the package config,
# so it must run before `pip install .`.
# Pin to a specific upstream commit for reproducible builds. This is
# snurr-group/mofid master as of 2026-08-20; bump it deliberately (and re-test
# the OpenBabel/toolchain pins above) rather than tracking a moving branch.
# A SHA (not just a branch/tag) is why we init+fetch instead of clone --branch,
# which only accepts ref names.
ARG MOFID_REF=36873683083c7bc62c1da2062df2833adc35b48a
RUN git init /opt/mofid \
    && git -C /opt/mofid fetch --depth 1 https://github.com/snurr-group/mofid.git ${MOFID_REF} \
    && git -C /opt/mofid checkout --detach FETCH_HEAD
WORKDIR /opt/mofid
RUN make init \
    && python set_paths.py \
    && pip install .

WORKDIR /opt/app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .

EXPOSE 5000

# The Systre step can take a while on large frameworks, and requests are
# expected to be low-volume. The worker timeout is kept above the Rails client
# timeout (MofService uses 180s) so the client times out first with a clean
# Net::ReadTimeout instead of racing gunicorn's abrupt worker kill.
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "300", "app:app"]
