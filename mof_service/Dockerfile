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
ARG MOFID_REF=master
RUN git clone --depth 1 --branch ${MOFID_REF} https://github.com/snurr-group/mofid.git /opt/mofid
WORKDIR /opt/mofid
RUN make init \
    && python set_paths.py \
    && pip install .

WORKDIR /opt/app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .

EXPOSE 5000

# A single worker with a generous timeout — the Systre step can take a while
# on large frameworks, and requests are expected to be low-volume.
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "180", "app:app"]
