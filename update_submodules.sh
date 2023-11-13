#!/bin/bash

echo "Checking whether the local repository is on the main branch, squeaky clean and up to date with the remote..."

# Check if the repository is on the main branch
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" != "main" ]; then
  echo "ERROR: Not on the main branch. Please switch to the main branch."
  exit 1
fi

# Check if there are any pending changes in the local repository
if [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: There are pending changes in the repository. Please commit or stash them before proceeding."
  exit 1
fi

# Check if the main branch is up to date with the remote
git fetch origin
local_commits=$(git rev-list HEAD..origin/main --count)
if [ "$local_commits" -ne 0 ]; then
  echo "ERROR: The main branch is not up to date with the remote. Please pull the latest changes."
  exit 1
fi

echo "Everything looks good."

echo "Will fetch and merge changes from all submodules, if any..."

# Save the current commit hash of the submodule
OLD_COMMIT=$(git submodule status | awk '{print $1}')

# Update the submodule
git submodule update --remote --merge

# Save the new commit hash of the submodule after update
NEW_COMMIT=$(git submodule status | awk '{print $1}')

# Compare the old and new commit hashes
if [ "$OLD_COMMIT" = "$NEW_COMMIT" ]; then
  echo "Submodules are up to date, no changes made."
else
  echo "Submodules have been updated and changes have been merged."
  echo "Running git add --all ..."
  git add --all
  echo "Running git commit -m ..."
  git commit -m "Update all submodules to latest upstream"
  echo "Running git push origin ..."
  git push origin
  echo "Done! Submodules updated successfully."
fi
