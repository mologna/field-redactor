#!/usr/bin/env python3
"""Rebuild master history so each release tag includes release notes and a matching package.json version."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NOTES_DIR = ROOT / "docs" / "release-notes"
NOTES_BACKUP = Path("/tmp/field-redactor-release-notes-backup")

COMMITS = [
    "77a85427d305687bce799bc79f7d0798b02b646d",
    "3cb5b382f18c46b3ba0580be59f0de504d510447",
    "bf30ad147a181238582c37b8604224f973f5b5ed",
    "bc4b0d7e6a3422b605d31bb6108db6599a5867eb",
    "f1b61665dc30027be3f95a156575ecc51e6dce81",
    "cac3fdd44e231270414f2b5b52d3d4c68d393404",
    "ef6f6ca802dbbc58645b23cf41ad5afd4c947fa8",
    "142c1610ee78882a0bf6f94543b40255abbbaf39",
    "e59c09b75654717080230f248eec12502a27c2bd",
    "d43994162f1853f672d5d3c5a602f83cbb016e60",
    "c58677a2a3a53cbbce9998624c789b8dfdd4b402",
    "4fb877fef1ffbc93ea534d499dc30901f9af2276",
    "57573beebd9978e0f950b42749837857a0f0078f",
    "ea56bc6f1c37432d61b9e86ab188985977bf92f8",
    "efd5e796dbc1181b4dffb6c271e63892c58b8a07",
    "74d7561f308b0e59684830e17acd5ca15399f73e",
    "9e3f2a93fc8d27287a4afc1e796ed267c6e02132",
    "cfa4d5d44c4171002f4d87575d85b2b51bb9eb20",
    "238db01c2044b7059d09833124351da0fda2823e",
    "c04d2d3f8617aa0d8f846cf740e23fc570bc6516",
]

RELEASES = [
    ("v1.0.0", "1.0.0", "v1.0.0.md"),
    ("v1.1.0", "1.1.0", "v1.1.0.md"),
    ("v1.2.0", "1.2.0", "v1.2.0.md"),
    ("v1.2.1", "1.2.1", "v1.2.1.md"),
    ("v1.2.2", "1.2.2", "v1.2.2.md"),
    ("2.0.0", "2.0.0", "2.0.0.md"),
    ("2.1.0", "2.1.0", "2.1.0.md"),
    ("2.2.0", "2.2.0", "2.2.0.md"),
    ("2.3.0", "2.3.0", "2.3.0.md"),
    ("2.3.1", "2.3.1", "2.3.1.md"),
    ("v1.3.0", "1.3.0", "v1.3.0.md"),
]

TAG_ON_COMMIT = {
    COMMITS[0]: RELEASES[0],
    COMMITS[1]: RELEASES[1],
    COMMITS[3]: RELEASES[2],
    COMMITS[6]: RELEASES[3],
    COMMITS[8]: RELEASES[4],
    COMMITS[10]: RELEASES[5],
    COMMITS[12]: RELEASES[6],
    COMMITS[16]: RELEASES[7],
    COMMITS[18]: RELEASES[8],
}


def run(*args: str) -> str:
    result = subprocess.run(args, cwd=ROOT, check=True, text=True, capture_output=True)
    return result.stdout.strip()


def set_package_version(version: str) -> None:
    package_path = ROOT / "package.json"
    data = json.loads(package_path.read_text())
    data["version"] = version
    package_path.write_text(json.dumps(data, indent=2) + "\n")


def install_release_notes(notes_backup: Path, up_to_index: int) -> None:
    NOTES_DIR.mkdir(parents=True, exist_ok=True)
    for _, _, note_file in RELEASES[: up_to_index + 1]:
        shutil.copy2(notes_backup / note_file, NOTES_DIR / note_file)
    shutil.copy2(notes_backup / "README.md", NOTES_DIR / "README.md")


def release_index(tag: str) -> int:
    for index, (name, _, _) in enumerate(RELEASES):
        if name == tag:
            return index
    raise KeyError(tag)


def cherry_pick_or_fail(commit: str) -> None:
    result = subprocess.run(["git", "cherry-pick", commit], cwd=ROOT, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"cherry-pick failed for {commit}:\n{result.stderr}")


def apply_release_prep_commit(source_commit: str, notes_backup: Path) -> None:
    for relative_path in ("CHANGELOG.md", "README.md"):
        backup_path = notes_backup / relative_path
        if backup_path.exists():
            content = backup_path.read_text()
        else:
            content = run("git", "show", f"{source_commit}:{relative_path}")
        (ROOT / relative_path).write_text(content if content.endswith("\n") else content + "\n")

    package_path = ROOT / "package.json"
    package = json.loads(package_path.read_text())
    source_package = json.loads(run("git", "show", f"{source_commit}:package.json"))
    package["prepublishOnly"] = source_package.get("prepublishOnly", "yarn build")
    package["version"] = "2.3.1"
    package_path.write_text(json.dumps(package, indent=2) + "\n")

    install_release_notes(notes_backup, release_index("2.3.1"))
    run("git", "add", "CHANGELOG.md", "README.md", "package.json", "docs/release-notes")
    message = run("git", "log", "-1", "--format=%B", source_commit)
    subprocess.run(["git", "commit", "-m", message], cwd=ROOT, check=True, text=True)


def main() -> int:
    if not (ROOT / ".git").exists():
        print("Must run from a git repository", file=sys.stderr)
        return 1

    if not NOTES_BACKUP.exists():
        print(f"Missing release notes backup at {NOTES_BACKUP}", file=sys.stderr)
        return 1

    original_branch = run("git", "branch", "--show-current")
    temp_branch = "release-align-temp"
    notes_backup = NOTES_BACKUP

    run("git", "stash", "push", "-u", "-m", "align-release-tags")
    run("git", "checkout", "-B", temp_branch, COMMITS[0])

    tag_to_new_commit: dict[str, str] = {}

    for index, commit in enumerate(COMMITS[:-1]):
        if index > 0:
            cherry_pick_or_fail(commit)

        if commit not in TAG_ON_COMMIT:
            continue

        tag, version, _ = TAG_ON_COMMIT[commit]
        install_release_notes(notes_backup, release_index(tag))
        set_package_version(version)
        run("git", "add", "package.json", "docs/release-notes")
        run("git", "commit", "--amend", "--no-edit")
        tag_to_new_commit[tag] = run("git", "rev-parse", "HEAD")

    apply_release_prep_commit(COMMITS[-1], notes_backup)
    tag_to_new_commit["2.3.1"] = run("git", "rev-parse", "HEAD")

    install_release_notes(notes_backup, release_index("v1.3.0"))
    set_package_version("1.3.0")
    run("git", "add", "package.json", "docs/release-notes")
    run(
        "git",
        "commit",
        "-m",
        "Release v1.3.0 for npm with package version aligned to tag.",
    )
    tag_to_new_commit["v1.3.0"] = run("git", "rev-parse", "HEAD")

    run("git", "branch", "-f", original_branch, "HEAD")
    run("git", "checkout", original_branch)
    run("git", "branch", "-D", temp_branch)

    stash_list = run("git", "stash", "list")
    if "align-release-tags" in stash_list:
        pop_result = subprocess.run(["git", "stash", "pop"], cwd=ROOT, capture_output=True, text=True)
        if pop_result.returncode != 0:
            print(pop_result.stderr, file=sys.stderr)

    for tag, new_commit in tag_to_new_commit.items():
        note_file = RELEASES[release_index(tag)][2]
        subject = run("git", "log", "-1", "--format=%s", new_commit)
        run(
            "git",
            "tag",
            "-f",
            "-a",
            tag,
            "-m",
            f"{tag}: {subject}\n\nRelease notes: docs/release-notes/{note_file}",
            new_commit,
        )

    print("Updated tags:")
    for tag, commit in tag_to_new_commit.items():
        version = RELEASES[release_index(tag)][1]
        print(f"  {tag} ({version}) -> {commit}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
