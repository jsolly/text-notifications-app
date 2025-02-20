#!/usr/bin/env python3

import subprocess
import shutil
import os
from pathlib import Path
from typing import List, NamedTuple

# Suppress debugger warnings
os.environ["PYDEVD_DISABLE_FILE_VALIDATION"] = "1"


class BuildResult(NamedTuple):
    """Result of a Lambda build"""

    path: Path
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
        # Verify index.ts exists
        if not (lambda_dir / "index.ts").exists():
            return BuildResult(lambda_dir, False, "No index.ts found")

        # Clean and create dist directory
        dist_dir = lambda_dir / "dist"
        shutil.rmtree(dist_dir, ignore_errors=True)
        dist_dir.mkdir(exist_ok=True)

        # Install dependencies and build
        subprocess.run(["pnpm", "install"], cwd=lambda_dir, check=True)
        subprocess.run(
            [
                "pnpm",
                "exec",
                "esbuild",
                "index.ts",
                "--bundle",
                # "--minify",
                "--sourcemap",
                "--platform=node",
                "--target=es2020",
                "--external:pg",
                "--outfile=dist/index.js",
            ],
            cwd=lambda_dir,
            check=True,
        )

        # Setup production dist
        shutil.copy2(lambda_dir / "package.json", dist_dir / "package.json")
        subprocess.run(["pnpm", "install", "--prod"], cwd=dist_dir, check=True)

        # Create deployment package
        subprocess.run(
            ["zip", "-r", "../deployment.zip", "."],
            cwd=dist_dir,
            stdout=subprocess.DEVNULL,
            check=True,
        )

        return BuildResult(lambda_dir, True)

    except subprocess.CalledProcessError as e:
        return BuildResult(lambda_dir, False, str(e))


def build_python_lambda(lambda_dir: Path) -> BuildResult:
    """Build a Python Lambda function"""
    try:
        # Verify index.py exists
        if not (lambda_dir / "index.py").exists():
            return BuildResult(lambda_dir, False, "No index.py found")

        # Clean and create package directory
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
        subprocess.run(
            ["zip", "-g", "deployment.zip", "index.py"],
            cwd=lambda_dir,
            stdout=subprocess.DEVNULL,
            check=True,
        )

        return BuildResult(lambda_dir, True)

    except subprocess.CalledProcessError as e:
        return BuildResult(lambda_dir, False, str(e))


def find_lambda_functions(base_dir: Path) -> List[tuple[Path, bool]]:
    """Find all Lambda functions and return list of (path, is_typescript) tuples"""
    lambda_functions = []

    # Find TypeScript Lambdas (have package.json)
    for package_json in base_dir.glob("**/package.json"):
        if (
            "node_modules" not in package_json.parts
            and "dist" not in package_json.parts
        ):
            lambda_functions.append((package_json.parent, True))

    # Find Python Lambdas (have requirements.txt)
    for requirements_txt in base_dir.glob("**/requirements.txt"):
        if "node_modules" not in requirements_txt.parts:
            lambda_functions.append((requirements_txt.parent, False))

    return lambda_functions


def main():
    """Build all Lambda functions"""
    script_dir = Path(__file__).parent
    lambdas = find_lambda_functions(script_dir)

    print(f"Found {len(lambdas)} Lambda functions:")
    for path, is_ts in lambdas:
        print(f"- {'TypeScript' if is_ts else 'Python'}: {path}")
    print()

    # Build each function
    results = []
    for lambda_dir, is_typescript in lambdas:
        builder = build_typescript_lambda if is_typescript else build_python_lambda
        result = builder(lambda_dir)
        results.append(result)

        # Print result
        lang = "TypeScript" if is_typescript else "Python"
        if result.success:
            print(f"✅ Built {lang} Lambda: {result.path}")
        else:
            print(f"❌ Failed to build {lang} Lambda: {result.path}")
            print(f"   Error: {result.error}")
        print()

    # Exit with success only if all builds succeeded
    return 0 if all(r.success for r in results) else 1


if __name__ == "__main__":
    exit(main())
