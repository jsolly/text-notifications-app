#!/usr/bin/env python3
import re
from pathlib import Path


def main():
    # Get the project root directory
    root_dir = Path(__file__).parent.parent

    # Define the paths to the requirements.txt files for Python Lambda functions
    requirement_files = [
        root_dir / "backend" / "functions" / "nasa_photo_fetcher" / "requirements.txt",
        root_dir / "backend" / "functions" / "nasa_photo_sender" / "requirements.txt",
    ]

    # Dictionary to store package versions
    packages = {}

    # Process each requirements file
    for req_file in requirement_files:
        if req_file.exists():
            print(f"Processing {req_file}")
            with open(req_file) as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue

                    # Extract package name and version
                    match = re.match(r"^([^=<>~!]+)([=<>~!].+)?$", line)
                    if match:
                        package, version = match.groups()
                        package = package.strip()
                        version = version.strip() if version else ""

                        # Store the highest version if the package already exists
                        if package in packages:
                            if not version:
                                # Keep the versioned requirement if it exists
                                continue
                            elif not packages[package]:
                                # Replace unversioned with versioned
                                packages[package] = version
                            elif version != packages[package]:
                                # Try to keep the highest version
                                print(
                                    f"WARNING: Version conflict for {package}: "
                                    f"{packages[package]} vs {version}"
                                )
                                # For simplicity, we'll keep the latter version here
                                packages[package] = version
                        else:
                            packages[package] = version

    # Add development dependencies
    dev_dependencies = {
        "ruff": "==0.3.4",
        "pytest": "==7.4.3",
        "pytest-watch": "==4.2.0",
    }

    for package, version in dev_dependencies.items():
        if package in packages:
            print(
                f"WARNING: Dev dependency {package} already in packages with "
                f"version {packages[package]}"
            )
            # Keep existing version if it exists
        else:
            packages[package] = version

    # Generate the combined requirements.txt file
    combined_file = root_dir / "requirements.txt"
    with open(combined_file, "w") as f:
        f.write("# Combined requirements for Lambda functions\n")
        f.write("# Includes development dependencies (ruff, pytest)\n")
        for package, version in sorted(packages.items()):
            f.write(f"{package}{version}\n")

    print(f"Combined requirements written to {combined_file}")


if __name__ == "__main__":
    main()
