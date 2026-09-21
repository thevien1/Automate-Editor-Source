#!/usr/bin/env python3
"""
scripts/find_image.py
High-speed template matching using OpenCV and multi-scale DPI-aware matching.
Used by GPM Automate actions:
- Wait to image (type 107)
- Image exists (type 108)
- Image search (type 109)
"""

import sys
import os
import json
import cv2
import numpy as np

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Missing template path argument"}))
        sys.exit(1)

    template_path = sys.argv[1]
    threshold = float(sys.argv[2]) if len(sys.argv) > 2 else 0.7
    true_color = (sys.argv[3].lower() in ['1', 'true', 'yes']) if len(sys.argv) > 3 else False
    use_stdin = ('--stdin' in sys.argv)

    if not os.path.exists(template_path):
        print(json.dumps({"success": False, "error": f"Template file not found: {template_path}"}))
        sys.exit(1)

    template = cv2.imread(template_path, cv2.IMREAD_COLOR)
    if template is None:
        print(json.dumps({"success": False, "error": f"Failed to decode template image from {template_path}"}))
        sys.exit(1)

    haystack = None
    if use_stdin:
        try:
            stdin_data = sys.stdin.buffer.read()
            if stdin_data and len(stdin_data) > 0:
                haystack = cv2.imdecode(np.frombuffer(stdin_data, np.uint8), cv2.IMREAD_COLOR)
        except Exception:
            pass

    if haystack is None:
        print(json.dumps({"success": False, "error": "Failed to capture or receive screen image"}))
        sys.exit(1)

    th, tw = template.shape[:2]
    hh, hw = haystack.shape[:2]

    try:
        if not true_color:
            h_proc = cv2.cvtColor(haystack, cv2.COLOR_BGR2GRAY)
            t_proc = cv2.cvtColor(template, cv2.COLOR_BGR2GRAY)
        else:
            h_proc = haystack
            t_proc = template

        # Multi-scale template matching to handle DPI differences (100%, 125%, 150%)
        best_score = -1.0
        best_loc = (0, 0)
        best_w, best_h = tw, th
        scales = [1.0, 0.95, 1.05, 0.9, 1.1, 0.85, 1.15, 0.8, 1.25, 0.75, 1.33, 0.67, 1.5, 0.55]

        for s in scales:
            sw = int(round(tw * s))
            sh = int(round(th * s))
            if sw > hw or sh > hh or sw < 10 or sh < 10:
                continue
            interp = cv2.INTER_AREA if s < 1.0 else cv2.INTER_LINEAR
            t_scaled = cv2.resize(t_proc, (sw, sh), interpolation=interp)
            res = cv2.matchTemplate(h_proc, t_scaled, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, max_loc = cv2.minMaxLoc(res)

            if max_val > best_score:
                best_score = float(max_val)
                best_loc = max_loc
                best_w = sw
                best_h = sh

            # Early exit if we got a high confidence match
            if best_score >= max(threshold, 0.88):
                break

        score = max(0.0, best_score)
        found = score >= threshold

        cx = int(best_loc[0] + best_w // 2)
        cy = int(best_loc[1] + best_h // 2)

        print(json.dumps({
            "success": True,
            "found": bool(found),
            "x": cx,
            "y": cy,
            "width": best_w,
            "height": best_h,
            "score": round(score, 4),
            "threshold": threshold
        }))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
