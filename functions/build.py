#!/usr/bin/env python3

import subprocess
import shutil
import os
from pathlib import Path
from typing import List, Tuple, NamedTuple

# Suppress debugger warnings
os.environ["PYDEVD_DISABLE_FILE_VALIDATION"] = "1"


class BuildResult(NamedTuple):
    """Result of a Lambda build"""

    path: Path
    is_typescript: bool
    success: bool
    error: str = ""


def upgrade_pip():
    """Upgrade pip to avoid version notices"""
    subprocess.run(
        ["python3", "-m", "pip", "install", "--upgrade", "pip"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=True,
    )


def build_typescript_lambda(lambda_dir: Path) -> BuildResult:
    """Build a TypeScript Lambda function"""
    try:
        # Check for index.ts
        index_ts = lambda_dir / "index.ts"
        if not index_ts.exists():
            return BuildResult(lambda_dir, True, False, "No index.ts found")

        dist_dir = lambda_dir / "dist"
        shutil.rmtree(dist_dir, ignore_errors=True)
        dist_dir.mkdir(exist_ok=True)

        # Install dependencies with CI=true to prevent prepare script
        env = os.environ.copy()
        env["CI"] = "true"
        subprocess.run(["pnpm", "install"], cwd=lambda_dir, check=True, env=env)

        # Build TypeScript
        subprocess.run(
            [
                "pnpm",
                "exec",
                "esbuild",
                "index.ts",
                "--bundle",
                "--platform=node",
                "--target=node20",
                "--outfile=dist/index.js",
                "--external:aws-sdk",
                "--external:@aws-sdk/*",
                "--minify",
                "--tsconfig=tsconfig.json",
            ],
            cwd=lambda_dir,
            check=True,
        )

        # Copy package.json and node_modules to dist
        shutil.copy2(lambda_dir / "package.json", dist_dir / "package.json")

        # Install production dependencies only in dist with CI=true
        subprocess.run(
            ["pnpm", "install", "--prod"],
            cwd=dist_dir,
            check=True,
            env=env,
        )

        # Create deployment package
        subprocess.run(
            ["zip", "-r", "../deployment.zip", "."],
            cwd=dist_dir,
            stdout=subprocess.DEVNULL,
            check=True,
        )
        return BuildResult(lambda_dir, True, True)

    except subprocess.CalledProcessError as e:
        return BuildResult(lambda_dir, True, False, str(e))


def build_python_lambda(lambda_dir: Path) -> BuildResult:
    """Build a Python Lambda function"""
    try:
        package_dir = lambda_dir / "package"
        shutil.rmtree(package_dir, ignore_errors=True)
        package_dir.mkdir(exist_ok=True)

        # Install dependencies
        subprocess.run(
            [
                "python3",
                "-m",
                "pip",
                "install",
                "--target",
                "./package",
                "-r",
                "requirements.txt",
            ],
            cwd=lambda_dir,
            check=True,
        )

        # Create deployment package
        subprocess.run(
            ["zip", "-r", "../deployment.zip", "."],
            cwd=package_dir,
            stdout=subprocess.DEVNULL,
            check=True,
        )

        # Add the main Python file to the zip
        index_py = lambda_dir / "index.py"
        if not index_py.exists():
            return BuildResult(lambda_dir, False, False, "No index.py found")

        subprocess.run(
            ["zip", "-g", "deployment.zip", "index.py"],
            cwd=lambda_dir,
            stdout=subprocess.DEVNULL,
            check=True,
        )
        return BuildResult(lambda_dir, False, True)

    except subprocess.CalledProcessError as e:
        return BuildResult(lambda_dir, False, False, str(e))


def find_lambda_functions(base_dir: Path) -> List[Tuple[Path, bool]]:
    """Find all Lambda functions and return list of (path, is_typescript) tuples"""
    lambda_functions = []

    # Find all package.json files (TypeScript Lambdas)
    for package_json in base_dir.glob("**/package.json"):
        if (
            "node_modules" not in package_json.parts
            and "dist" not in package_json.parts
        ):
            lambda_functions.append((package_json.parent, True))

    # Find all requirements.txt files (Python Lambdas)
    for requirements_txt in base_dir.glob("**/requirements.txt"):
        if "node_modules" not in requirements_txt.parts:
            lambda_functions.append((requirements_txt.parent, False))

    return lambda_functions


def print_build_results(results: List[BuildResult]):
    """Print build process output and summary"""
    for result in results:
        lang = "TypeScript" if result.is_typescript else "Python"
        if result.success:
            print(f"🔍 Building {lang} Lambda in {result.path}/")
            print("📥 Installing dependencies...")
            print("🔨 Building...")
            print(f"✅ Successfully built {result.path}/deployment.zip")
            print("------------------------")
        else:
            print(f"❌ Failed to build {lang} Lambda {result.path}/")
            print(f"Error: {result.error}")
            print("------------------------")

    # Print summary
    successful = [r for r in results if r.success]
    print("\n📋 Build Summary:")
    for result in successful:
        lang = "TypeScript" if result.is_typescript else "Python"
        print(f"✅ [{lang}] {result.path}/")

    print("\n✨ Build process complete!")


def main():
    """Main build process"""
    # Upgrade pip first
    upgrade_pip()

    # Use the directory where this script is located as the base
    script_dir = Path(__file__).parent

    # Find all Lambda functions
    lambdas = find_lambda_functions(script_dir)
    print(f"Found {len(lambdas)} Lambda functions:")
    for lambda_dir, is_typescript in lambdas:
        lang = "TypeScript" if is_typescript else "Python"
        print(f"- {lang}: {lambda_dir}")
    print()

    # Build each function
    results = []
    for lambda_dir, is_typescript in lambdas:
        result = (
            build_typescript_lambda(lambda_dir)
            if is_typescript
            else build_python_lambda(lambda_dir)
        )
        results.append(result)

    # Print results
    print_build_results(results)

    # Return success if all builds succeeded
    return 0 if all(r.success for r in results) else 1


if __name__ == "__main__":
    exit(main())
