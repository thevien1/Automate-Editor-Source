#!/usr/bin/env python3
"""
scripts/mouse_click.py
Simulates real Windows OS mouse movement and clicks using Win32 API.
Used for clicking coordinates on the desktop / native browser dialogs (e.g., 'Add extension' modal).
"""

import sys
import time
import ctypes

def click(x, y, button='left', clicks=1):
    try:
        user32 = ctypes.windll.user32
        user32.SetProcessDPIAware()

        target_x = int(round(float(x)))
        target_y = int(round(float(y)))

        user32.SetCursorPos(target_x, target_y)
        time.sleep(0.04)

        if button == 'right':
            down_flag = 0x0008 # MOUSEEVENTF_RIGHTDOWN
            up_flag = 0x0010   # MOUSEEVENTF_RIGHTUP
        elif button == 'middle':
            down_flag = 0x0020 # MOUSEEVENTF_MIDDLEDOWN
            up_flag = 0x0040   # MOUSEEVENTF_MIDDLEUP
        else:
            down_flag = 0x0002 # MOUSEEVENTF_LEFTDOWN
            up_flag = 0x0004   # MOUSEEVENTF_LEFTUP

        for _ in range(clicks):
            user32.mouse_event(down_flag, 0, 0, 0, 0)
            time.sleep(0.03)
            user32.mouse_event(up_flag, 0, 0, 0, 0)
            time.sleep(0.03)

        print('{"success": true}')
    except Exception as e:
        print(f'{{"success": false, "error": "{str(e)}"}}')

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('{"success": false, "error": "Usage: mouse_click.py <x> <y> [button] [clicks]"}')
        sys.exit(1)

    x = sys.argv[1]
    y = sys.argv[2]
    btn = sys.argv[3] if len(sys.argv) > 3 else 'left'
    count = int(sys.argv[4]) if len(sys.argv) > 4 else 1

    click(x, y, btn, count)
