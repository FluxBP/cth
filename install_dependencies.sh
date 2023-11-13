#!/bin/bash

echo "Will attempt to install required packages using apt-get."

if [ "$EUID" -ne 0 ]; then
    echo "This script requires superuser privileges to perform package installations. Please run:"
    echo "    sudo ./install_dependencies.sh"
    exit 1
fi

echo
echo "------------------------------------------------------------------------"
echo "PACKAGE: nodejs"
echo "  nodejs is a Javascript runtime that's needed to support JS tests."
echo "------------------------------------------------------------------------"
echo

echo "Checking for package nodejs ..."

# Check if nodejs is already installed
if ! command -v node &> /dev/null; then
    echo "Installing nodejs..."
    sudo apt-get update
    sudo apt-get install -y nodejs
    echo "nodejs is now installed and ready to use."
else
    echo "nodejs is already installed."
fi

echo
echo "------------------------------------------------------------------------"
echo "PACKAGE: jq"
echo "  jq is used to write testcases. It is used by some of the DoH tests."
echo "------------------------------------------------------------------------"
echo

echo "Checking for package jq ..."

# Check if jq is already installed
if ! command -v jq &> /dev/null; then
    echo "Installing jq..."
    sudo apt-get update
    sudo apt-get install -y jq
    echo "jq is now ready to use! Enjoy manipulating JSON data in your test code."
else
    echo "jq is already installed."
fi

echo
echo "------------------------------------------------------------------------"
echo "PACKAGE: wget"
echo "  wget is used for downloading files from the web."
echo "------------------------------------------------------------------------"
echo

echo "Checking for package wget ..."

# Check if wget is already installed
if ! command -v wget &> /dev/null; then
    echo "Installing wget..."
    sudo apt-get update
    sudo apt-get install -y wget
    echo "wget is now ready to use! You can use it to download files from the web."
else
    echo "wget is already installed."
fi

echo
echo "------------------------------------------------------------------------"
echo "PACKAGE: build-essential"
echo "  build-essential is needed for compiling and building software."
echo "------------------------------------------------------------------------"
echo

echo "Checking for package build-essential ..."
if ! dpkg -l | grep -q build-essential; then
    echo "Installing build-essential..."
    sudo apt-get update
    sudo apt-get install -y build-essential
    echo "build-essential is now installed and ready to use."
else
    echo "build-essential is already installed."
fi

echo
echo "------------------------------------------------------------------------"
echo "PACKAGE: cmake"
echo "  cmake is used for building and configuring projects."
echo "------------------------------------------------------------------------"
echo

echo "Checking for package cmake ..."
if ! dpkg -l | grep -q cmake; then
    echo "Installing cmake..."
    sudo apt-get update
    sudo apt-get install -y cmake
    echo "cmake is now installed and ready to use."
else
    echo "cmake is already installed."
fi

echo
echo "------------------------------------------------------------------------"
echo "PACKAGE: git"
echo "  git is a version control system used for managing source code."
echo "------------------------------------------------------------------------"
echo

echo "Checking for package git ..."
if ! dpkg -l | grep -q git; then
    echo "Installing git..."
    sudo apt-get update
    sudo apt-get install -y git
    echo "git is now installed and ready to use."
else
    echo "git is already installed."
fi

# Use the `which` command to check if "cdt-cpp" is installed
if ! which cdt-cpp &> /dev/null; then
    echo
    echo "*************************************************************"
    echo "* WARNING: Antelope CDT doesn't seem to be installed.       *"
    echo "* This script does not install Antelope CDT.                *"
    echo "* Make sure to install it in your system.                   *"
    echo "* Antelope CDT:   https://github.com/AntelopeIO/cdt/        *"
    echo "*************************************************************"
    echo
fi

# Use the `which` command to check if "nodeos" is installed
if ! which nodeos &> /dev/null; then
    echo
    echo "*************************************************************"
    echo "* WARNING: Antelope Leap doesn't seem to be installed.      *"
    echo "* This script does not install Antelope Leap.               *"
    echo "* Make sure to install it in your system.                   *"
    echo "* Antelope Leap:  https://github.com/AntelopeIO/leap/       *"
    echo "*************************************************************"
    echo
fi
