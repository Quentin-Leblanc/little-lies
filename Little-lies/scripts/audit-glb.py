"""Audit GLB/GLTF assets in public/models/ vs. references in src/.

Usage:
    python scripts/audit-glb.py

Reports:
  1. Files present on disk but never referenced in code (candidates for removal)
  2. Files referenced in code but missing on disk (would 404 at runtime)
  3. Totals: disk size vs. referenced size

Does NOT delete anything — pipe into `xargs rm` yourself after review.
"""
from __future__ import annotations
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public" / "models"
SRC = ROOT / "src"

EXTS = (".glb", ".gltf")

# Regex finds quoted '/models/foo.glb' or 'foo.gltf' paths in source.
# We keep the relative path (to public/models) to normalize comparisons.
REF_RE = re.compile(r"['\"]/?models/([A-Za-z0-9_\-./]+\.(?:glb|gltf))['\"]")


def collect_disk() -> dict[str, int]:
    found = {}
    for p in PUBLIC.rglob("*"):
        if p.is_file() and p.suffix.lower() in EXTS:
            rel = p.relative_to(PUBLIC).as_posix()
            found[rel] = p.stat().st_size
    return found


def collect_refs() -> set[str]:
    refs = set()
    for p in SRC.rglob("*"):
        if not p.is_file() or p.suffix not in {".js", ".jsx", ".ts", ".tsx"}:
            continue
        try:
            content = p.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for m in REF_RE.finditer(content):
            refs.add(m.group(1))
    return refs


def fmt_size(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.1f}{unit}"
        n /= 1024
    return f"{n:.1f}TB"


def main() -> None:
    disk = collect_disk()
    refs = collect_refs()

    disk_set = set(disk.keys())

    unused = sorted(disk_set - refs)
    missing = sorted(refs - disk_set)

    total_disk = sum(disk.values())
    unused_size = sum(disk[k] for k in unused)
    used_size = total_disk - unused_size

    print(f"Disk   : {len(disk):3d} files, {fmt_size(total_disk)}")
    print(f"Used   : {len(disk) - len(unused):3d} files, {fmt_size(used_size)}")
    print(f"Unused : {len(unused):3d} files, {fmt_size(unused_size)}  "
          f"({unused_size / total_disk * 100:.0f}% of disk)")
    print()

    if missing:
        print("MISSING on disk but referenced in src (will 404 at runtime):")
        for m in missing:
            print(f"  {m}")
        print()

    if unused:
        print("UNUSED on disk, safe to remove (re-verify before deleting):")
        for u in unused:
            print(f"  {fmt_size(disk[u]):>10s}  {u}")


if __name__ == "__main__":
    main()
