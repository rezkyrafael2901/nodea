#!/usr/bin/env python3
"""Verify NODEA header lockup precision via pixel analysis.

Detects the white logo N mark vs the ODEA text cap band and reports:
  - logo bottom vs ODEA cap baseline (baseline align)
  - logo top vs ODEA cap top (cap-height align)
  - gap between N mark right edge and ODEA first glyph left edge
Usage: python3 verify_header.py <screenshot.png>
"""
import sys
import numpy as np
from PIL import Image

def main(path: str) -> None:
    img = Image.open(path).convert("L")
    arr = np.array(img)
    h, w = arr.shape
    # White-ish pixels (logo N + ODEA text are pure white)
    mask = arr > 200

    # Column profile: count white pixels per column
    col_sum = mask.sum(axis=0)

    # Find runs of columns with any white
    cols_with = col_sum > 0

    # First contiguous block = logo N (starts at x=0-ish, small width ~16px rendered)
    # We locate transitions: runs of True
    runs = []
    x = 0
    while x < w:
        if cols_with[x]:
            start = x
            while x < w and cols_with[x]:
                x += 1
            runs.append((start, x - 1))
        else:
            x += 1

    if not runs:
        print("NO_WHITE_PIXELS")
        return

    # Run 1 = N mark (leftmost). Run 2 = ODEA block.
    n_run = runs[0]
    odea_runs = [r for r in runs[1:] if (r[1] - r[0]) > 3]
    # ODEA block = merge from first wide run onward that is spatially near N (or just take run 2)
    odea_block = None
    for r in odea_runs:
        if r[0] > n_run[1] + 1:
            odea_block = r
            break

    def bbox(x0, x1):
        region = mask[:, x0:x1 + 1]
        ys = np.where(region.any(axis=1))[0]
        if len(ys) == 0:
            return None
        return int(ys.min()), int(ys.max())

    n_bb = bbox(n_run[0], n_run[1])
    o_bb = bbox(odea_block[0], odea_block[1]) if odea_block else None

    print(f"image: {w}x{h}")
    print(f"N run cols: {n_run[0]}-{n_run[1]} (width {n_run[1]-n_run[0]+1})")
    if odea_block:
        print(f"ODEA run cols: {odea_block[0]}-{odea_block[1]} (width {odea_block[1]-odea_block[0]+1})")
        print(f"gap N->O: {odea_block[0]-n_run[1]-1}px")
    if n_bb:
        print(f"N bbox y: {n_bb[0]}-{n_bb[1]} (h {n_bb[1]-n_bb[0]+1})")
    if o_bb:
        print(f"ODEA bbox y: {o_bb[0]}-{o_bb[1]} (h {o_bb[1]-o_bb[0]+1})")
    if n_bb and o_bb:
        print(f"top delta (N - ODEA): {n_bb[0] - o_bb[0]}px")
        print(f"bottom delta (N - ODEA): {n_bb[1] - o_bb[1]}px")
        print("VERDICT: " + ("OK aligned" if abs(n_bb[1] - o_bb[1]) <= 2 and abs(n_bb[0] - o_bb[0]) <= 2 else "NEEDS ADJUST"))

if __name__ == "__main__":
    main(sys.argv[1])